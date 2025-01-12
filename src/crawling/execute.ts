import {
  getWorkspaceInfo,
  getChannels,
  getChannelMembers,
  sendDirectMessage,
} from './utils';

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
  try {
    const targetMember = members[randomMemberIndex];
    sendDirectMessage(targetMember, '테스트메시지');
  } catch (e) {}
});
