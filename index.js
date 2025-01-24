const path = require("path");
const http = require('http');
const https = require('https'); // 如果是 HTTPS URL
const fs = require('fs');
const cors = require('cors');
const querystring = require("querystring");
const express = require("express");
const morgan = require("morgan");
const { init: initDB, Counter, DeviceRegistration, FirmwareInfo} = require("./db");
const { error } = require("console");

const logger = morgan("tiny");

const app = express();
app.use('/static', express.static('static'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(logger);

function generateUUID(macAddress) {
  // 获取当前时间戳
  console.log("MacAddress", macAddress);
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

function GetDownloadFileInfo(cloud_file_id) {
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

app.post("/api/uploadfileinfo", async (req, res) => {
  const { file_name } = req.body;
  console.log("filename", file_name);
  // 模拟后端处理
  if (!file_name) {
    console.log("filename is required");
    res.send({
      code: 404,
      data: {
        message : "file name is null",
        ret : { code: 404},
      },
    });
    return;
  }
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
app.post("/api/getNewVersion", async (req, res) => {
  const { device_type, version } = req.body;
  // 校验输入
  if (!device_type || !version)  {
    return res.status(400).send({
      code: 1,
      message: "参数无效，请传递两个数字。",
    });
  }
  // 查询数据
  try {
    // 查询版本小于指定版本的记录
    const records = await FirmwareInfo.findAll({
      where: {
        deviceType: deviceType,
        version: {
          [Op.gt]: version, // 小于输入版本
        },
      },
      order: [['version', 'DESC']], // 按版本号升序排序
    });

    if (records.length === 0) {
      res.send({
        code: 404,
        errmsg: 'No matching records found',
      });
    } else {
      res.send({
        code: 200,
        errmsg: "ok",
        data: records.map((record) => record.toJSON()),
      });
    }
  } catch (error) {
    console.error("Error during querying:", error);
    res.send({
      code: 500,
      errmsg: error.message,
    });
  }
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
app.post("/api/save_firmware_info", async (req, res) => {
  // Response: { "firmware": { "version": "1.0.0", "url": "http://" } }
  const { device_type, firmware_version, oss_fileid, md5s } = req.body;
  // 模拟后端处理
  if (!firmware_version) {
    return res.status(400).json({ error: 'firmware_version_ are required!' });
  }
  console.log("get ota firmware_version", firmware_version)
  // 插入数据
  try {
    // 插入数据
    const newRecord = await FirmwareInfo.create({
      deviceType: device_type, // 设备类型
      status: "inactive", // 状态
      version: firmware_version,
      md5: md5s,
      fileid: oss_fileid, // 文件 ID
      billingTime: new Date(), // 可选的计费时间
    });
    console.log("New record added:", newRecord.toJSON());
    // // 查询数据
    // const allRecords = await FirmwareInfo.findAll();
    // console.log("All records:", allRecords.map((record) => record.toJSON()));
    res.send({
      code: 200,
      errmsg: 'ok'
    });
  } catch (error) {
    console.error("Error during operation:", error);
    res.send({
      code: 401,
      errmsg: error
    });
  } 
});

// 新增接口：注册设备生成UUID
app.post("/api/generateUUID", async (req, res) => {
  const { macAddress } = req.body;
  // 模拟后端处理
  if (!macAddress) {
    return res.status(400).json({ error: 'macAddress are required!' });
  }
  console.log("get mac", macAddress)
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
