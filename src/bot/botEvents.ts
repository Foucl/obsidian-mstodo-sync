import { Bot, Message } from 'mirai-js';
import MsTodoSync from '../main';
import { getBiliInfo } from './bilibili';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getBilibiliCover = async function (data: any, bot: Bot, plugin?: MsTodoSync) {
	const sender = data.sender;
	const message = data.messageChain[1];
	const reg = /https?:\/\/((www|m)\.bilibili\.com\/video\/\S*\?|b23\.tv\/\S*)/gm;

	const target = (message.text ?? message.content?.replace(/\\/gm, ''))?.match(reg);
	if (target) {
		await bot.sendMessage({
			friend: sender.id,
			message: new Message().addImageUrl(await getBiliInfo(target[0])),
		});
	}
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const echo = async function (data: any, bot: Bot) {
	const sender = data.sender;
	await bot.sendMessage({
		friend: sender.id,
		message: data.messageChain,
	});
};