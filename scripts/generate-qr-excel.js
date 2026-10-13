#!/usr/bin/env node
/**
 * 百万级二维码 Excel/CSV/TXT 测试导入文件极速生成脚本 (ESM)
 * 
 * 用法示例：
 *   node scripts/generate-qr-excel.js --count 1000000 --start BAT20261013000001
 *   node scripts/generate-qr-excel.js -n 500000 -s CELL-0000001 -c full -o ./test_qr.xlsx
 *   node scripts/generate-qr-excel.js --help
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import process from 'node:process';

// 命令行参数解析
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        count: 100000,
        start: 'BAT20261013000001',
        format: 'xlsx',
        columns: 'single', // 'single' (二维码编号) 或 'full' (二维码编号, 电压(V), 内阻(mΩ))
        out: ''
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--help' || arg === '-h') {
            console.log(`
百万级二维码导入文件生成工具 (CLI)

参数说明：
  -n, --count <number>     生成行数 (默认: 100000，最大支持 1048576)
  -s, --start <codeString> 起始二维码码段 (默认: BAT20261013000001)
  -f, --format <xlsx|csv|txt> 导出格式 (默认: xlsx)
  -c, --columns <single|full> 列模式: single (仅二维码编号) 或 full (含电压和内阻) (默认: single)
  -o, --out <filePath>     输出文件路径 (默认: 自动按规则生成)
  -h, --help               查看帮助信息
            `);
            process.exit(0);
        } else if ((arg === '-n' || arg === '--count') && args[i + 1]) {
            options.count = parseInt(args[++i], 10);
        } else if ((arg === '-s' || arg === '--start') && args[i + 1]) {
            options.start = args[++i].trim();
        } else if ((arg === '-f' || arg === '--format') && args[i + 1]) {
            options.format = args[++i].toLowerCase();
        } else if ((arg === '-c' || arg === '--columns') && args[i + 1]) {
            options.columns = args[++i].toLowerCase();
        } else if ((arg === '-o' || arg === '--out') && args[i + 1]) {
            options.out = args[++i].trim();
        }
    }

    if (isNaN(options.count) || options.count <= 0) {
        console.error('错误: 生成行数必须为正整数');
        process.exit(1);
    }
    if (options.count > 1048576 && options.format === 'xlsx') {
        console.error('错误: Excel 单 Sheet 最大行数为 1,048,576 行，请将行数控制在该范围内或使用 CSV/TXT 格式');
        process.exit(1);
    }
    return options;
}

// 码段分析
function parseStartCode(code) {
    let digitIdx = -1;
    for (let i = 0; i < code.length; i++) {
        if (code[i] >= '0' && code[i] <= '9') {
            digitIdx = i;
            break;
        }
    }
    if (digitIdx === -1) {
        throw new Error('起始码必须包含数字序号部分 (例如: BAT000001)');
    }
    const prefix = code.substring(0, digitIdx);
    const numStr = code.substring(digitIdx);
    const padLen = numStr.length;
    const startNum = BigInt(numStr);
    return { prefix, startNum, padLen };
}

// CRC-32 查表加速
function makeCrcTable() {
    let c;
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        c = n;
        for (let k = 0; k < 8; k++) {
            c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        table[n] = c;
    }
    return table;
}
const CRC_TABLE = makeCrcTable();
function updateCrc32(crc, buf) {
    for (let i = 0; i < buf.length; i++) {
        crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xFF];
    }
    return crc;
}

// 简易流式 ZIP 打包器 (内存友好)
class StreamZipWriter {
    constructor(outPath) {
        this.writeStream = fs.createWriteStream(outPath);
        this.offset = 0;
        this.files = [];
    }

    addStaticFile(name, contentBuffer, compress = true) {
        const uncompressedSize = contentBuffer.length;
        let crc = 0xFFFFFFFF;
        crc = updateCrc32(crc, contentBuffer) ^ 0xFFFFFFFF;

        let compressedData = contentBuffer;
        let method = 0; // Store

        if (compress && uncompressedSize > 0) {
            compressedData = zlib.deflateRawSync(contentBuffer, { level: 4 });
            method = 8; // Deflate
        }

        const nameBuf = Buffer.from(name, 'utf8');
        const localHeader = Buffer.alloc(30 + nameBuf.length);
        localHeader.writeUInt32LE(0x04034b50, 0);
        localHeader.writeUInt16LE(20, 4);
        localHeader.writeUInt16LE(0, 6);
        localHeader.writeUInt16LE(method, 8);
        localHeader.writeUInt16LE(0, 10);
        localHeader.writeUInt16LE(0, 12);
        localHeader.writeUInt32LE(crc >>> 0, 14);
        localHeader.writeUInt32LE(compressedData.length, 18);
        localHeader.writeUInt32LE(uncompressedSize, 22);
        localHeader.writeUInt16LE(nameBuf.length, 26);
        localHeader.writeUInt16LE(0, 28);
        nameBuf.copy(localHeader, 30);

        this.writeStream.write(localHeader);
        this.writeStream.write(compressedData);

        this.files.push({
            name,
            crc: crc >>> 0,
            method,
            compressedSize: compressedData.length,
            uncompressedSize,
            offset: this.offset
        });

        this.offset += localHeader.length + compressedData.length;
    }

    startDeflateFile(name) {
        const nameBuf = Buffer.from(name, 'utf8');
        const localHeader = Buffer.alloc(30 + nameBuf.length);
        localHeader.writeUInt32LE(0x04034b50, 0);
        localHeader.writeUInt16LE(20, 4);
        localHeader.writeUInt16LE(0, 6);
        localHeader.writeUInt16LE(8, 8); // Deflate
        localHeader.writeUInt16LE(0, 10);
        localHeader.writeUInt16LE(0, 12);
        localHeader.writeUInt32LE(0, 14);
        localHeader.writeUInt32LE(0, 18);
        localHeader.writeUInt32LE(0, 22);
        localHeader.writeUInt16LE(nameBuf.length, 26);
        localHeader.writeUInt16LE(0, 28);
        nameBuf.copy(localHeader, 30);

        this.writeStream.write(localHeader);
        const fileStartOffset = this.offset;
        this.offset += localHeader.length;

        const deflateStream = zlib.createDeflateRaw({ level: 4 });
        let crc = 0xFFFFFFFF;
        let uncompressedSize = 0;
        let compressedSize = 0;

        deflateStream.on('data', chunk => {
            compressedSize += chunk.length;
            this.offset += chunk.length;
            this.writeStream.write(chunk);
        });

        return {
            write: (chunkBuf) => {
                crc = updateCrc32(crc, chunkBuf);
                uncompressedSize += chunkBuf.length;
                deflateStream.write(chunkBuf);
            },
            finish: () => {
                return new Promise(resolve => {
                    deflateStream.end(() => {
                        this.files.push({
                            name,
                            crc: (crc ^ 0xFFFFFFFF) >>> 0,
                            method: 8,
                            compressedSize,
                            uncompressedSize,
                            offset: fileStartOffset
                        });
                        resolve();
                    });
                });
            }
        };
    }

    async close() {
        const cdStartOffset = this.offset;
        let cdSize = 0;

        for (const file of this.files) {
            const nameBuf = Buffer.from(file.name, 'utf8');
            const cdHeader = Buffer.alloc(46 + nameBuf.length);
            cdHeader.writeUInt32LE(0x02014b50, 0);
            cdHeader.writeUInt16LE(20, 4);
            cdHeader.writeUInt16LE(20, 6);
            cdHeader.writeUInt16LE(0, 8);
            cdHeader.writeUInt16LE(file.method, 10);
            cdHeader.writeUInt16LE(0, 12);
            cdHeader.writeUInt16LE(0, 14);
            cdHeader.writeUInt32LE(file.crc, 16);
            cdHeader.writeUInt32LE(file.compressedSize, 20);
            cdHeader.writeUInt32LE(file.uncompressedSize, 24);
            cdHeader.writeUInt16LE(nameBuf.length, 28);
            cdHeader.writeUInt16LE(0, 30);
            cdHeader.writeUInt16LE(0, 32);
            cdHeader.writeUInt16LE(0, 34);
            cdHeader.writeUInt16LE(0, 36);
            cdHeader.writeUInt32LE(0, 38);
            cdHeader.writeUInt32LE(file.offset, 42);
            nameBuf.copy(cdHeader, 46);

            this.writeStream.write(cdHeader);
            cdSize += cdHeader.length;
        }

        const eocd = Buffer.alloc(22);
        eocd.writeUInt32LE(0x06054b50, 0);
        eocd.writeUInt16LE(0, 4);
        eocd.writeUInt16LE(0, 6);
        eocd.writeUInt16LE(this.files.length, 8);
        eocd.writeUInt16LE(this.files.length, 10);
        eocd.writeUInt32LE(cdSize, 12);
        eocd.writeUInt32LE(cdStartOffset, 16);
        eocd.writeUInt16LE(0, 20);

        this.writeStream.write(eocd);

        return new Promise((resolve, reject) => {
            this.writeStream.end(() => {
                resolve();
            });
            this.writeStream.on('error', reject);
        });
    }
}

// 主流程
async function main() {
    const opts = parseArgs();
    const { prefix, startNum, padLen } = parseStartCode(opts.start);
    const endNum = startNum + BigInt(opts.count - 1);
    const endCode = prefix + endNum.toString().padStart(padLen, '0');

    let outPath = opts.out;
    if (!outPath) {
        const ext = opts.format === 'csv' ? '.csv' : (opts.format === 'txt' ? '.txt' : '.xlsx');
        outPath = path.resolve(process.cwd(), `qrcode_import_${opts.count}_${opts.start}${ext}`);
    } else {
        outPath = path.resolve(process.cwd(), outPath);
    }

    console.log('--------------------------------------------------');
    console.log('🚀 二维码导入测试文件生成器启动');
    console.log(`   目标行数: ${opts.count.toLocaleString()} 行`);
    console.log(`   起始条码: ${opts.start}`);
    console.log(`   终止条码: ${endCode}`);
    console.log(`   导出格式: ${opts.format.toUpperCase()}`);
    console.log(`   数据列  : ${opts.columns === 'full' ? '二维码编号, 电压(V), 内阻(mΩ)' : '二维码编号'}`);
    console.log(`   输出文件: ${outPath}`);
    console.log('--------------------------------------------------');

    const startTime = Date.now();

    if (opts.format === 'xlsx') {
        const zipWriter = new StreamZipWriter(outPath);

        // 写入静态配置 XML
        zipWriter.addStaticFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`, 'utf8'));

        zipWriter.addStaticFile('_rels/.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`, 'utf8'));

        zipWriter.addStaticFile('xl/_rels/workbook.xml.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`, 'utf8'));

        zipWriter.addStaticFile('xl/workbook.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`, 'utf8'));

        // 准备流式写入 sheet1.xml
        const sheetEntry = zipWriter.startDeflateFile('xl/worksheets/sheet1.xml');

        let headerRow = `<row r="1"><c r="A1" t="inlineStr"><is><t>二维码编号</t></is></c>`;
        if (opts.columns === 'full') {
            headerRow += `<c r="B1" t="inlineStr"><is><t>电压(V)</t></is></c><c r="C1" t="inlineStr"><is><t>内阻(mΩ)</t></is></c>`;
        }
        headerRow += `</row>\n`;

        const sheetHead = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n<sheetData>\n` + headerRow;
        sheetEntry.write(Buffer.from(sheetHead, 'utf8'));

        const CHUNK_SIZE = 25000;
        const total = opts.count;
        const isFull = opts.columns === 'full';

        for (let chunkStart = 0; chunkStart < total; chunkStart += CHUNK_SIZE) {
            const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, total);
            let chunkXml = '';
            for (let i = chunkStart; i < chunkEnd; i++) {
                const row = i + 2;
                const curNum = startNum + BigInt(i);
                const code = prefix + curNum.toString().padStart(padLen, '0');
                if (isFull) {
                    chunkXml += `<row r="${row}"><c r="A${row}" t="inlineStr"><is><t>${code}</t></is></c><c r="B${row}"><v>3.85</v></c><c r="C${row}"><v>15.2</v></c></row>\n`;
                } else {
                    chunkXml += `<row r="${row}"><c r="A${row}" t="inlineStr"><is><t>${code}</t></is></c></row>\n`;
                }
            }
            sheetEntry.write(Buffer.from(chunkXml, 'utf8'));

            const progress = ((chunkEnd / total) * 100).toFixed(1);
            const speed = Math.round(chunkEnd / ((Date.now() - startTime) / 1000 || 1));
            process.stdout.write(`\r⏳ 正在流式生成并打包: ${progress}% (${chunkEnd.toLocaleString()} / ${total.toLocaleString()}) - 速率: ${speed.toLocaleString()} 行/秒`);
        }

        sheetEntry.write(Buffer.from(`</sheetData></worksheet>`, 'utf8'));
        await sheetEntry.finish();
        await zipWriter.close();

    } else if (opts.format === 'csv') {
        const writeStream = fs.createWriteStream(outPath);
        // UTF-8 BOM
        writeStream.write(Buffer.from([0xEF, 0xBB, 0xBF]));
        if (opts.columns === 'full') {
            writeStream.write('二维码编号,电压(V),内阻(mΩ)\n');
        } else {
            writeStream.write('二维码编号\n');
        }

        const CHUNK_SIZE = 50000;
        const total = opts.count;
        const isFull = opts.columns === 'full';

        for (let chunkStart = 0; chunkStart < total; chunkStart += CHUNK_SIZE) {
            const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, total);
            let chunkText = '';
            for (let i = chunkStart; i < chunkEnd; i++) {
                const curNum = startNum + BigInt(i);
                const code = prefix + curNum.toString().padStart(padLen, '0');
                if (isFull) {
                    chunkText += `${code},3.85,15.2\n`;
                } else {
                    chunkText += `${code}\n`;
                }
            }
            writeStream.write(chunkText);
            const progress = ((chunkEnd / total) * 100).toFixed(1);
            process.stdout.write(`\r⏳ 正在写入 CSV: ${progress}% (${chunkEnd.toLocaleString()} / ${total.toLocaleString()})`);
        }
        await new Promise(res => writeStream.end(res));

    } else if (opts.format === 'txt') {
        const writeStream = fs.createWriteStream(outPath);
        if (opts.columns === 'full') {
            writeStream.write('二维码编号\t电压(V)\t内阻(mΩ)\n');
        } else {
            writeStream.write('二维码编号\n');
        }

        const CHUNK_SIZE = 50000;
        const total = opts.count;
        const isFull = opts.columns === 'full';

        for (let chunkStart = 0; chunkStart < total; chunkStart += CHUNK_SIZE) {
            const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, total);
            let chunkText = '';
            for (let i = chunkStart; i < chunkEnd; i++) {
                const curNum = startNum + BigInt(i);
                const code = prefix + curNum.toString().padStart(padLen, '0');
                if (isFull) {
                    chunkText += `${code}\t3.85\t15.2\n`;
                } else {
                    chunkText += `${code}\n`;
                }
            }
            writeStream.write(chunkText);
            const progress = ((chunkEnd / total) * 100).toFixed(1);
            process.stdout.write(`\r⏳ 正在写入 TXT: ${progress}% (${chunkEnd.toLocaleString()} / ${total.toLocaleString()})`);
        }
        await new Promise(res => writeStream.end(res));
    }

    const cost = ((Date.now() - startTime) / 1000).toFixed(2);
    const stat = fs.statSync(outPath);
    const sizeMb = (stat.size / 1024 / 1024).toFixed(2);

    console.log('\n\n✅ 导出文件生成完毕！');
    console.log(`   耗时: ${cost} 秒`);
    console.log(`   文件体积: ${sizeMb} MB (${stat.size.toLocaleString()} 字节)`);
    console.log(`   平均吞吐: ${Math.round(opts.count / cost).toLocaleString()} 行/秒`);
    console.log(`   文件地址: ${outPath}`);
    console.log('--------------------------------------------------');
}

main().catch(err => {
    console.error('\n❌ 生成失败:', err);
    process.exit(1);
});
