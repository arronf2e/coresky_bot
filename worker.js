import { workerData, parentPort } from 'worker_threads';
import { ethers } from 'ethers';
import { SocksProxyAgent } from 'socks-proxy-agent';
import axios from 'axios';
import chalk from 'chalk';

// 工具函数
const log = msg => {
    const time = new Date().toLocaleTimeString();
    parentPort.postMessage(`${chalk.gray(`[${time}]`)} ${msg}`);
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const THREAD_DELAY = Math.random() * (workerData.MAX_THREAD_DELAY || 60) * 1000; // 随机延迟 0-60 秒
// 初始化合约
const provider = new ethers.JsonRpcProvider(workerData.RPC_URL);
const wallet = new ethers.Wallet(workerData.privateKey, provider);

const refCode = 'dtsfy5';

// 核心业务流程
async function mainLoop() {
    try {
        log(chalk.yellow(`⇄ 开始登录...，使用代理 ${workerData.proxy || '无'}`));
        const token = await login(wallet.address, workerData.proxy, refCode);
        log(chalk.green(`✅ 登录成功: ${token}`));
        log(chalk.green(`⏳ 获取任务列表...`));
        const tasks = await getTasks(token);
        for (let i = 0; i < tasks?.length; i++) {
            const task = tasks[i];
            if(task.uuid === '5a4fe700d8d1411d88ba56b3942b0b7f' && task.actionName === 'Check In') {
                if (task.taskStatus === 2) {
                    log(chalk.yellow(`⏳ 跳过已完成任务 ${task.taskName}...`));
                    continue;
                }
                log(chalk.green(`⏳ 开始签到...`));
                await checkIn(token);
                await delay(5000);
            }
            if (task.taskStatus === 2) {
                log(chalk.yellow(`⏳ 跳过已完成任务 ${task.taskName}...`));
                continue;
            }
        }

    } catch (error) {
        log(chalk.red(`流程错误: ${error.message}`));
    }
}

async function checkIn(token) {
    try {
        const response = await axios.post(
            'https://www.coresky.com/api/taskwall/meme/sign',
            null, // POST 请求体为空
            {
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'accept-language': 'zh-CN,zh;q=0.9',
                    'hearder_gray_set': '0',
                    'origin': 'https://www.coresky.com',
                    'priority': 'u=1, i',
                    'referer': 'https://www.coresky.com/tasks-rewards',
                    'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"macOS"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin',
                    'token': token,
                    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
                },
                withCredentials: true
            }
        );
        if (response.data.code !== 200) {
            throw new Error(response.data.message);
        }
        log(chalk.green(`✅ 签到成功`));
        return response.data;
    } catch (error) {
        log(chalk.red(`❌ 签到失败: ${error.message}`));
        throw error;
    }
}

async function getTasks(token) {
    try {
        const response = await axios.get(
            'https://www.coresky.com/api/taskwall/meme/tasks',
            {
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'accept-language': 'zh-CN,zh;q=0.9',
                    'hearder_gray_set': '0',
                    'priority': 'u=1, i',
                    'referer': 'https://www.coresky.com/tasks-rewards',
                    'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"macOS"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin',
                    'token': token,
                    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
                },
                withCredentials: true
            }
        );
        if (response.data.code !== 200) {
            throw new Error(response.data.message);
        }
        log(chalk.green(`✅ 获取任务成功`));
        return response.data?.debug;
    } catch (error) {
        log(chalk.red(`❌ 获取任务失败: ${error.message}`));
        throw error;
    }
}

async function login(address, proxy, refCode = "dtsfy5") {
    const message = `Welcome to CoreSky!\n\nClick to sign in and accept the CoreSky Terms of Service.\n\nThis request will not trigger a blockchain transaction or cost any gas fees.\n\nYour authentication status will reset after 24 hours.\n\nWallet address:\n\n${address}`;
    const signature = await wallet.signMessage(message);

    const agent = proxy ? new SocksProxyAgent(proxy) : null;
    try {
        const response = await axios.post(
            'https://www.coresky.com/api/user/login',
            {
                address: address,
                signature: signature,
                projectId: "0",
                refCode
            },
            {
                headers: {
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
                    "Origin": "https://www.coresky.com",
                    "Referer": "https://www.coresky.com/",
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-origin",
                },
                httpsAgent: agent,
                httpAgent: agent,
            }
        );
        if (response.data.code !== 200) {
            throw new Error(response.data.message);
        }
        return response.data?.debug?.token
    } catch (error) {
        log(chalk.red(`❌ 登录失败: ${error.message}`));
        throw error;
    }
}

async function startWithDelay() {
    log(chalk.yellow(`⏳ 线程将在 ${(THREAD_DELAY / 1000).toFixed(1)} 秒后开始...`));
    await new Promise(resolve => setTimeout(resolve, THREAD_DELAY));
    log(chalk.yellow(`👛 钱包 ${wallet.address.slice(0, 6)}... 开始运行`));
    mainLoop();
}

// 替换原来的启动命令
startWithDelay();
