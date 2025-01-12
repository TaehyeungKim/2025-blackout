// src/index.ts

import express from 'express';
import * as dotenv from 'dotenv';
import { App, ExpressReceiver } from '@slack/bolt';
import { registerReactionAddedEvent } from './translation';
import { registerWelcomeEvents } from './welcome';
import { registerAdminEvents } from './admin';
import { registerNetworkCommands, registerNetworkViewHandler } from './network';
import { registerTradeEvents } from './trade';
import { registerTodayConversationEvents } from './today';
import { registerHelpCommand } from './help';
import { registerAdminHelpCommand } from './admin_help';
import { registerHoneyScore } from './network/honeyscore';
import { crawlSite, useUpdateCrawlingLink } from './crawling';
import { Browser, chromium, Page } from 'playwright';
import { WebClient } from '@slack/web-api';
import {
  getWorkspaceInfo,
  getChannelMembers,
  getChannels,
  sendDirectMessage,
} from './crawling/utils';
import { requestInformation } from './AImodel';

dotenv.config();

// 환경 변수 로드 여부 확인 (디버깅용)
console.log('SLACK_BOT_TOKEN is set:', !!process.env.SLACK_BOT_TOKEN);
console.log(process.env.SLACK_BOT_TOKEN);
console.log('SLACK_SIGNING_SECRET is set:', !!process.env.SLACK_SIGNING_SECRET);
console.log(process.env.SLACK_SIGNING_SECRET);

// ExpressReceiver 초기화
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});
export const web = new WebClient(process.env.SLACK_BOT_TOKEN);

// const app = express();
// 슬랙에서 오는 요청은 application/x-www-form-urlencoded 형식입니다
receiver.router.use(express.urlencoded({ extended: true }));
receiver.router.use(express.json());

// URL 검증 처리 - ExpressReceiver의 Express 앱 사용
receiver.router.post('/slack/events', (req, res) => {
  const { type, challenge } = req.body;

  if (type === 'url_verification') {
    res.status(200).send(challenge); // Slack에서 보내는 검증 요청 처리
    return;
  }

  res.status(200).send(); // 다른 요청에 대해 200 응답
});

// Slack Bolt 앱 초기화
export const boltApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  receiver, // ExpressReceiver 연결
});

boltApp.command('/searchinfo', async ({ command, ack, client }) => {
  // 슬래시 명령을 확인
  await ack();

  const userId = command.user_id;
  const query = command.text || 'No query provided';

  getWorkspaceInfo().then(async (info) => {
    const { country, universitySite, university } = info;
    console.log('스페이스 Info', country, university, universitySite);

    const channels = await getChannels();
    if (!channels || channels.length === 0) return;
    const targetChannel = channels[0];
    const id = targetChannel.id;
    if (!id) return;
    const members = await getChannelMembers(id);
    if (!members) return;
    const randomMemberIndex = Math.floor(
      Math.min(members.length - 1, Math.floor(Math.random() * 10)),
    );
    const url = await emitUpdateCrawlingEvent('컴퓨터', 'https://snu.ac.kr');
    const parsed = await crawlSite(url);

    const text = await requestInformation(parsed);
    try {
      const targetMember = members[randomMemberIndex];
      sendDirectMessage(targetMember, text);
    } catch (e) {}
  });

  try {
    // 사용자 DM으로 메시지 전송
    await client.chat.postMessage({
      channel: userId, // 사용자 ID를 DM 채널로 사용
      text: `🔍 You searched for: *${query}*.\nHere's some information about your query: [example link](https://example.com).`,
    });

    console.log(`Message sent to user ${userId}`);
  } catch (error) {
    console.error(`Error sending DM: ${error}`);
  }
});

// Bolt의 액션 핸들러 등록
// boltApp.action('button_click', async ({ ack, body, client }) => {
//   await ack(); // 액션을 확인합니다.

//   try {
//     // 클릭한 사용자에게 DM 전송
//     await client.chat.postMessage({
//       channel: body.user.id, // 사용자 ID로 메시지 전송
//       text: 'Button clicked! Here is your response.',
//     });
//     console.log('Message sent to user:', body.user.id);
//   } catch (error) {
//     console.error('Error sending message:', error);
//   }
// });

export const updateCrawlingLink = async (
  keyword: string,
  entry: string,
  browser: Browser,
  page: Page,
) => {
  const result = await useUpdateCrawlingLink(keyword, entry, browser, page);
  console.log(result);
  const regex = /https?:\/\/[^\s]+/g;
  const matches = result.match(regex);
  if (!matches) {
    return entry;
  }
  return matches[0];
};

export const emitUpdateCrawlingEvent = async (
  keyword: string,
  entry: string,
) => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(10000);
  const url = await updateCrawlingLink(keyword, entry, browser, page);
  await page.close();
  await browser.close();
  return url;
};

// 이벤트 핸들러 및 명령어 핸들러 등록

(async () => {
  const port = process.env.PORT || 3000;
  await boltApp.start(port); // 서버 시작
  console.log(`⚡️ Slack app is running on port ${port}`);
})();
