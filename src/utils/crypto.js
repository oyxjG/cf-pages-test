/**
 * 使用 SHA-256 对字符串进行哈希处理
 * @param {string} text 
 * @returns {Promise<string>} 哈希后的十六进制字符串
 */
export async function hashPassword(text) {
  const msgUint8 = new TextEncoder().encode(text);                           // 编码为 (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);           // 计算哈希值
  const hashArray = Array.from(new Uint8Array(hashBuffer));                     // 转换为字节数组
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // 转换为十六进制字符串
  return hashHex;
}
