function generateUUID(macAddress) {
  // 获取当前时间戳
  const timestamp = Date.now();

  // 创建一个哈希函数 (例如 MD5 或 SHA256)
  const crypto = require("crypto");
  const hash = crypto.createHash("md5");

  // 将 MAC 地址和时间戳拼接为字符串
  const input = `${macAddress}-${timestamp}-"Ihome-rxl`;

  // 生成哈希值
  hash.update(input);
  const hashed = hash.digest("hex");

  // 转换哈希值为 UUID 格式 (8-4-4-4-12)
  const uuid = `${hashed.substring(0, 8)}-${hashed.substring(8, 12)}-${hashed.substring(12, 16)}-${hashed.substring(16, 20)}-${hashed.substring(20, 32)}`;

  return uuid;
}

// 示例用法
const macAddress = "12:34:56:78:9A:BC";
const uuid = generateUUID(macAddress);
console.log("Generated UUID:", uuid);
