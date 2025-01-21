const { Sequelize, DataTypes } = require("sequelize");

// 从环境变量中读取数据库配置
const { MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_ADDRESS = "" } = process.env;

const [host, port] = MYSQL_ADDRESS.split(":");

const sequelize = new Sequelize("nodejs_demo", MYSQL_USERNAME, MYSQL_PASSWORD, {
  host,
  port,
  dialect: "mysql" /* one of 'mysql' | 'mariadb' | 'postgres' | 'mssql' */,
});

// 定义数据模型
const Counter = sequelize.define("Counter", {
  count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
});

// 定义设备注册信息模型
const DeviceRegistration = sequelize.define("DeviceRegistration", {
  deviceName: {
    type: DataTypes.STRING,
    allowNull: false, // 设备名称不能为空
  },
  deviceType: {
    type: DataTypes.STRING,
    allowNull: false, // 设备类型不能为空
  },
  uuid: {
    type: DataTypes.STRING,
    allowNull: false, // UUID 不能为空
    unique: true, // UUID 唯一
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false, // 绑定的用户 ID 不能为空
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false, // 当前状态不能为空
    defaultValue: "inactive", // 默认状态为 inactive
  },
  registrationTime: {
    type: DataTypes.DATE,
    allowNull: false, // 注册时间不能为空
    defaultValue: Sequelize.NOW, // 默认值为当前时间
  },
  billingTime: {
    type: DataTypes.DATE, // 计费时间可以为空
    allowNull: true,
  },
  cost: {
    type: DataTypes.FLOAT, // 费用，允许小数
    allowNull: true, // 费用可以为空
    defaultValue: 0.0, // 默认费用为 0
  },
});


// 定义设备注册信息模型
const OTAInfo = sequelize.define("OTAInfo", {
  deviceName: {
    type: DataTypes.STRING,
    allowNull: false, // 设备名称不能为空
  },
  deviceType: {
    type: DataTypes.STRING,
    allowNull: false, // 设备类型不能为空
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false, // 当前状态不能为空
    defaultValue: "inactive", // 默认状态为 inactive
  },
  registrationTime: {
    type: DataTypes.DATE,
    allowNull: false, // 注册时间不能为空
    defaultValue: Sequelize.NOW, // 默认值为当前时间
  },
  billingTime: {
    type: DataTypes.DATE, // 计费时间可以为空
    allowNull: true,
  },
});

// 数据库初始化方法
async function init() {
  await Counter.sync({ alter: true });
  await DeviceRegistration.sync({ alter: true }); // 同步模型到数据库
}

// 导出初始化方法和模型
module.exports = {
  init,
  Counter,
  DeviceRegistration,
  OTAInfo,
};
