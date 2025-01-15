const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { init: initDB, Counter DeviceRegistration} = require("./db");

const logger = morgan("tiny");

const app = express();
app.use('/static', express.static('static'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(logger);

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
