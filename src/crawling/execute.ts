import { emitUpdateCrawlingEvent } from '../index';
import { web } from '../index';
import { getFileFromS3 } from '../s3service';
// 특정 사용자에게 DM 보내는 함수
const sendDirectMessage = async (userId: string, message: string) => {
  try {
    const conversationResponse = await web.conversations.open({
      users: userId,
    });
    if (!conversationResponse.ok) {
      throw new Error('Failed to open conversation');
    }
    const channelId = conversationResponse.channel?.id;
    if (!channelId) {
      throw new Error('Channel ID not found');
    }
    const messageResponse = await web.chat.postMessage({
      channel: channelId,
      text: message,
    });
    if (!messageResponse.ok) {
      throw new Error('Failed to send message');
    }
    console.log('Message sent successfully!');
  } catch (error) {
    console.error('Error sending message:', error);
  }
};

export const getChannelMembers = async (channelId: string) => {
  try {
    // conversations.members API 호출하여 채널에 속한 사용자들의 ID 목록을 가져옴
    const response = await web.conversations.members({
      channel: channelId,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch channel members');
    }

    // 반환된 사용자 ID 목록
    const memberIds = response.members;

    console.log('Channel Members:', memberIds);
    return memberIds;
  } catch (error) {
    console.error('Error fetching channel members:', error);
  }
};

export const getWorkspaceInfo = async () => {
  const res = await getFileFromS3(
    'blackout-15-globee',
    `${process.env.SLACK_BOT_TOKEN}.json`,
  );

  const workspaceInfo = JSON.parse(res);
  console.log(workspaceInfo);
};

export const getChannels = async () => {
  try {
    const response = await web.conversations.list({
      types: 'public_channel,private_channel', // 공개 채널과 비공개 채널 모두 가져오기
    });

    if (!response.ok) {
      throw new Error('Failed to fetch channels');
    }

    const channels = response.channels;
    console.log('Available Channels:', channels);
    return channels;
  } catch (error) {
    console.error('Error fetching channels:', error);
  }
};
