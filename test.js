
const http = require('http');
const https = require('https'); // 如果是 HTTPS URL
const fs = require('fs');
const path = require('path');
const querystring = require("querystring");
const host_url = 'https://express-y9id-133296-9-1333806028.sh.run.tcloudbase.com/';
// const host_url = 'http://127.0.0.1:27082/';

// get uuid
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

/**
 * 下载文件的函数
 * @param {string} fileUrl - 文件的下载链接
 * @param {string} savePath - 保存文件的本地路径
 */
function downloadFile(fileUrl, savePath) {
  // 判断协议是 HTTP 还是 HTTPS
  const client = fileUrl.startsWith('https') ? https : http;

  console.log(`开始下载文件: ${fileUrl}`);
  
  client.get(fileUrl, (res) => {
    if (res.statusCode === 200) {
      // 创建文件写入流
      const fileStream = fs.createWriteStream(savePath);

      // 将响应的数据写入文件
      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`文件已成功保存到: ${savePath}`);
      });
    } else {
      console.error(`下载失败，状态码: ${res.statusCode}`);
    }
  }).on('error', (err) => {
    console.error(`下载出错: ${err.message}`);
  });
}

// 示例使用
const fileUrl = 'https://7072-prod-4ghi2bc084652daf-1333806028.tcb.qcloud.la/esp32s3_firmeware/v1.0.1.zip?sign=45044bd9d183f459cfc02dd04a686ea3&t=1737373221'; // 替换为文件的实际 URL
const savePath = path.resolve(__dirname, './ESP32S3-1-V1.0.1.zip'); // 保存的文件路径

//downloadFile(fileUrl, savePath);


const appId = "wxdac6a220e6df20e8"; // 替换为你的 APPID
const appSecret = "29c0caaabf539102f0468a6713928068"; // 替换为你的 APPSECRET
const env = "prod-4ghi2bc084652daf"; // 替换为云环境 ID
const oss_path = "esp32s3_firmeware/test.zip"; // 替换为文件路径

function getToken(appId, appSecret) {
  const params = querystring.stringify({
    grant_type: "client_credential",
    appid: appId,
    secret: appSecret,
  });

  const options = {
    hostname: "api.weixin.qq.com",
    port: 443,
    path: `/cgi-bin/token?${params}`,
    method: "GET",
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";

      // 接收数据
      res.on("data", (chunk) => {
        data += chunk;
      });

      // 数据接收完毕
      res.on("end", () => {
        try {
          const json = JSON.parse(data);

          if (json.access_token) {
            // 成功返回 token
            resolve({ code: 200, token: json.access_token });
          } else {
            // API 返回错误
            resolve({ code: res.statusCode || 400, message: json.errmsg || "Unknown error" });
          }
        } catch (error) {
          // 解析响应失败
          reject({ code: 500, message: "Failed to parse response" });
        }
      });
    });

    // 请求错误处理
    req.on("error", (error) => {
      reject({ code: 500, message: error.message });
    });

    // 发送请求
    req.end();
  });
}

function GetuploadFileInfo(accessToken, env, path) {
  const data = JSON.stringify({
    env: env, // 云环境 ID
    path: path, // 文件路径
  });

  const options = {
    hostname: "api.weixin.qq.com",
    port: 443,
    path: `/tcb/uploadfile?access_token=${accessToken}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = "";

      // 接收数据
      res.on("data", (chunk) => {
        responseData += chunk;
      });

      // 数据接收完成
      res.on("end", () => {
        try {
          const json = JSON.parse(responseData);

          if (json.errcode === 0) {
            resolve({ code: 200, data: json });
          } else {
            resolve({ code: json.errcode, message: json.errmsg });
          }
        } catch (error) {
          reject({ code: 500, message: "Failed to parse response" });
        }
      });
    });

    // 请求错误处理
    req.on("error", (error) => {
      reject({ code: 500, message: error.message });
    });

    // 写入请求数据
    req.write(data);

    // 结束请求
    req.end();
  });
}

// 示例用法
async function  getinfo() {
  const env = "prod-4ghi2bc084652daf"; // 替换为云环境 ID
  const oss_path = "esp32s3_firmeware/test.zip"; // 替换为文件路径
  try {
    const result = await getToken(appId, appSecret);
    if (result.code === 200) {
      console.log("Access Token:", result.token);
      try {
        let access_token = result.token;
        const ret = await GetuploadFileInfo(access_token, env, oss_path);
        if (ret.code === 200) {
          console.log("File upload response:", ret.data.url);
        } else {
          console.error("Error:", ret.message || `Code: ${ret.code}`);
        }
      } catch (error) {
        console.error("Failed to upload file:", error);
      }
    } else {
      console.error("Error:", result.message || `Code: ${result.code}`);
    }
  } catch (error) {
    console.error("Failed to fetch token:", error);
  }
}

//getinfo()

function GetDownloadInfo(accessToken, cloudFileId) {
  return new Promise((resolve, reject) => {
    const url = `https://api.weixin.qq.com/tcb/batchdownloadfile?access_token=${accessToken}`;
    const payload = JSON.stringify({
      env: "prod-4ghi2bc084652daf", // Replace with your Cloud Environment ID
      file_list: [
        { fileid: cloudFileId, max_age: 7200 }
      ]
    });
    // Configure the HTTP request options
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };
    // Create the HTTP request
    const req = https.request(url, options, (res) => {
      let data = "";
      // Collect data chunks
      res.on("data", (chunk) => {
        data += chunk;
      });

      // Resolve the Promise once all data is received
      res.on("end", () => {
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            resolve({ code: 200, errmsg: result.errmsg, data: result });
          } catch (error) {
            resolve({ code: 400, errmsg: "json parser error" });
          }
        } else {
          resolve({ code: res.statusCode, errmsg: res.statusMessage });
        }
      });
    });
    // Handle request errors
    req.on("error", (error) => {
      reject(new Error("Request error: " + error.message));
      resolve({ code: 401, errmsg: error.message });
    });
    // Write the payload and end the request
    req.write(payload);
    req.end();
  });
}

async function  downloadinfo() {
  const cloudFileId = "cloud://prod-4ghi2bc084652daf.7072-prod-4ghi2bc084652daf-1333806028/esp32s3_firmeware/v1.0.1.zip";
  try {
    const result = await getToken(appId, appSecret);
    if (result.code === 200) {
      console.log("Access Token:", result.token);
      try {
        let access_token = result.token;
        const ret = await GetDownloadInfo(access_token, cloudFileId);
        if (ret.code === 200) {
          console.log("File upload response:", ret);
          console.log("File upload url:", ret.data.file_list[0].download_url);
        } else {
          console.error("Error:", ret.message || `Code: ${ret.code}`);
        }
      } catch (error) {
        console.error("Failed to upload file:", error);
      }
    } else {
      console.error("Error:", result.message || `Code: ${result.code}`);
    }
  } catch (error) {
    console.error("Failed to fetch token:", error);
  }
}

//downloadinfo()

async function save_firmware_info(device_type__, version__, file_id__, md5__) {
  const body = {
    device_type_: device_type__,
    firmware_version_: version__,
    oss_fileid_: file_id__,
    md5: md5__
  };
  try {
      const response = await fetch('https://express-y9id-133296-9-1333806028.sh.run.tcloudbase.com/api/save_firmware_info', {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      });
      // 检查 HTTP 响应状态
      if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // 解析响应 JSON 数据
      const result = await response.json();
      console.log("Upload successful:", result);
      return result;
  } catch (error) {
      console.error("Error during upload:", error.message);
  }
}

async function uploadfile() {
  const file_name = "ESP32S3-1-V1.0.1.zip";
  const fileid = 'cloud://prod-4ghi2bc084652daf.7072-prod-4ghi2bc084652daf-1333806028/esp32s3_firmeware/v1.0.1.zip';
  // 正则表达式匹配
  const match = file_name.match(/(ESP32S3-\d+)-V(\d+\.\d+\.\d+)/);
  if (match) {
    const devic_type = match[1]; // 提取 ESP32S3-1
    const version = match[2]; // 提取 1.0.1
    console.log("devic_type 1:", devic_type);
    console.log("version 2:", version);
    const rett = await save_firmware_info(devic_type, version, fileid);
    console.log("version 2:", rett);
    if(rett.code === 200) {
      console.log('File info save successfully');
    } 
  } else {
    console.log('File name format error: ' + file.name);
  }
}

// uploadfile();

async function GetNewVersion() {
  const deviceType = "ESP32S3-1";
  const version = "1.0.1";

  try {
    const url = host_url + "api/getNewVersion";
    const response = await fetch(url, { // 替换为实际的 API 地址
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        device_type: deviceType,
        version: version,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    console.log("result:", result);

  } catch (error) {
    console.error('Error fetching new version:', error.message);
  }
}

GetNewVersion()