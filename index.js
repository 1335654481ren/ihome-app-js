const path = require("path");
const http = require('http');
const https = require('https'); // 如果是 HTTPS URL
const fs = require('fs');
const querystring = require("querystring");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { init: initDB, Counter, DeviceRegistration} = require("./db");

const logger = morgan("tiny");

const app = express();
app.use('/static', express.static('static'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(logger);

const env = "prod-4ghi2bc084652daf"; // 替换为云环境 ID
const oss_path = "esp32s3_firmeware/test.zip"; // 替换为文件路径

function generateUUID(macAddress) {
  // 获取当前时间戳
  const timestamp = Date.now();

  // 创建一个哈希函数 (例如 MD5 或 SHA256)
  const crypto = require("crypto");
  const hash = crypto.createHash("md5");

  // 将 MAC 地址和时间戳拼接为字符串
  const input = `${macAddress}-${timestamp}-"aionall"`;

  // 生成哈希值
  hash.update(input);
  const hashed = hash.digest("hex");

  // 转换哈希值为 UUID 格式 (8-4-4-4-12)
  const uuid = `${hashed.substring(0, 8)}-${hashed.substring(8, 12)}-${hashed.substring(12, 16)}-${hashed.substring(16, 20)}-${hashed.substring(20, 32)}`;

  return uuid;
}
function getToken() {
  const params = querystring.stringify({
    grant_type: "client_credential",
    appid: "wxdac6a220e6df20e8",
    secret: "29c0caaabf539102f0468a6713928068",
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
function GetuploadFileInfo(accessToken, file_name) {
  const data = JSON.stringify({
    env: "prod-4ghi2bc084652daf", // 云环境 ID
    path: `esp32s3_firmeware/${file_name}`, // 文件路径
  });
  console.log("data : ", data);
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

// 首页
app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 更新计数
app.post("/api/count", async (req, res) => {
  const { action } = req.body;
  if (action === "inc") {
    await Counter.create();
  } else if (action === "clear") {
    await Counter.destroy({
      truncate: true,
    });
  }
  res.send({
    code: 0,
    data: await Counter.count(),
  });
});

// 获取计数
app.get("/api/count", async (req, res) => {
  const result = await Counter.count();
  res.send({
    code: 0,
    data: result,
  });
});

// 小程序调用，获取微信 Open ID
app.get("/api/wx_openid", async (req, res) => {
  if (req.headers["x-wx-source"]) {
    res.send(req.headers["x-wx-openid"]);
  }
});

// 小程序调用，获取微信 Open ID
app.get("/api/access_token", async (req, res) => {
  let code, token, message;
  try {
    const result = await getToken();
    message = result.message
    code = result.code
    if (result.code === 200) {
      console.log("Access Token:", result.token);
      token = result.token;
    } else {
      console.error("Error:", result.message || `Code: ${result.code}`);
    }
  } catch (error) {
    console.error("Failed to fetch token:", error);
  }
  res.send({
    code: code,
    data: {
      token,
      message,
    },
  });
});

app.get("/api/uploadfileinfo", async (req, res) => {
  const { file_name } = req.body;
  console.log("file = ", file_name);
  let code = 0;
  let ret;
  try {
    const result = await getToken();
    message = result.message;
    code = result.code;
    if (result.code === 200) {
      console.log("Access Token:", result.token);
      try {
        ret = await GetuploadFileInfo(result.token,  file_name);
        message = ret.message;
        code = ret.code;
        if (ret.code === 200) {
          console.log("File upload response:", ret.data);
        } else {
          console.error("Error:", ret.message || `Code: ${rt.code}`);
        }
      } catch (error) {
        console.error("Failed to upload file:", error);
      }
    } else {
      console.error("Error:", result.message || `Code: ${result.code}`);
    }
  } catch (error) {
    message = "error";
    code = 504;
    console.error("Failed to fetch token:", error);
  }
  res.send({
    code: code,
    data: {
      message,
      ret,
    },
  });
});


// 新增接口：接收两个数并返回它们的和
app.post("/api/add", async (req, res) => {
  const { a, b } = req.body;
  // 校验输入
  if (typeof a !== "number" || typeof b !== "number") {
    return res.status(400).send({
      code: 1,
      message: "参数无效，请传递两个数字。",
    });
  }
  
  const sum = a + b;
  res.send({
    code: 0,
    data: {
      a,
      b,
      sum,
    },
  });
});

// 新增接口：注册设备生成UUID
app.post("/api/generateUUID", async (req, res) => {
  const { macAddress } = req.body;
  // 示例用法
  // macAddresss = "12:34:56:78:9A:BC";
  uuid = generateUUID(macAddress);
  console.log("Generated UUID:", uuid);
  res.send({
    code: 0,
    data: {
      uuid,
    },
  });
});

const port = process.env.PORT || 80;

async function bootstrap() {
  await initDB();
  app.listen(port, () => {
    console.log("启动成功", port);
  });
}

bootstrap();
