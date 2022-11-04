import MsTodoSync from "../main";
import { Notice, PluginSettingTab, Setting } from "obsidian";
import { getUptimerToken } from "../api/uptimerApi";
import { t } from "./../lib/lang";
import { LogOptions, log } from "./../lib/logging";

export interface MsTodoSyncSettings {
	todoListSync: {
		listName: string | undefined;
		listId: string | undefined;
	};
	uptimer: {
		email: string | undefined;
		password: string | undefined;
		token: string | undefined;
	};
	bot:
		| {
				baseUrl: string;
				verifyKey: string;
				qq: number | undefined;
				autoLaunch: boolean;
		  }
		| undefined;
	diary: {
		folder: string;
		format: string;
		stayWithPN: boolean;
	};

	displayOptions_DateFormat: string;
	displayOptions_TimeFormat: string;
	displayOptions_TaskCreatedPrefix: string;
	displayOptions_TaskDuePrefix: string;
	displayOptions_TaskStartPrefix: string;
	displayOptions_TaskBodyPrefix: string;
	displayOptions_ReplaceAddCreatedAt: boolean;

	// Logging options.
	loggingOptions: LogOptions;

	// Private configuration updated by the plugin and not user.
	taskIdLookup: { [key: string]: string };
	taskIdIndex: number;
}

export const DEFAULT_SETTINGS: MsTodoSyncSettings = {
	todoListSync: {
		listName: undefined,
		listId: undefined,
	},
	uptimer: {
		email: undefined,
		password: undefined,
		token: undefined,
	},
	bot: undefined,
	diary: {
		folder: "",
		format: "",
		stayWithPN: false,
	},
	displayOptions_DateFormat: "YYYY-MM-DD",
	displayOptions_TimeFormat: "HH:mm",
	displayOptions_TaskCreatedPrefix: "🔎",
	displayOptions_TaskDuePrefix: "📅",
	displayOptions_TaskStartPrefix: "🛫",
	displayOptions_TaskBodyPrefix: "💡",
	displayOptions_ReplaceAddCreatedAt: false,

	loggingOptions: {
		minLevels: {
			"": "info",
		},
	},
	taskIdLookup: { ["0000ABCD"]: "0" },
	taskIdIndex: 0,
};

export class MsTodoSyncSettingTab extends PluginSettingTab {
	plugin: MsTodoSync;
	settings: MsTodoSyncSettings;

	constructor(plugin: MsTodoSync) {
		super(app, plugin);
		this.plugin = plugin;
		this.settings = plugin.settings;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", {
			text: `${this.plugin.manifest.name}`,
		});
		const span = containerEl.createSpan();
		span.style.fontSize = "0.8em";
		span.innerHTML = `Version ${this.plugin.manifest.version} <br /> ${this.plugin.manifest.description} created by ${this.plugin.manifest.author}`;

		new Setting(containerEl)
			.setName(t("Settings_Todo_DefaultListName"))
			.setDesc(t("Settings_Todo_DefaultListNameDescription"))
			.addText((text) =>
				text
					// .setPlaceholder('输入Todo列表名称')
					.setValue(this.settings.todoListSync.listName ?? "")
					.onChange(async (value) => {
						this.settings.todoListSync.listName = value;
					})
			);

		// Formatting Options that user can set
		containerEl.createEl("h2", {
			text: t("Settings_Todo_Display_Heading"),
		});

		new Setting(containerEl)
			.setName(t("Settings_Todo_Display_DateFormat"))
			.setDesc(t("Settings_Todo_Display_DateFormatDescription"))
			.addText((text) =>
				text
					.setValue(this.settings.displayOptions_DateFormat ?? "")
					.onChange(async (value) => {
						this.settings.displayOptions_DateFormat = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(t("Settings_Todo_Display_TimeFormat"))
			.setDesc(t("Settings_Todo_Display_TimeFormatDescription"))
			.addText((text) =>
				text
					.setValue(this.settings.displayOptions_TimeFormat ?? "")
					.onChange(async (value) => {
						this.settings.displayOptions_TimeFormat = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(t("Settings_Todo_Display_AddCreatedAtOnReplace"))
			.setDesc(
				t("Settings_Todo_Display_AddCreatedAtOnReplaceDescription")
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.settings.displayOptions_ReplaceAddCreatedAt)
					.onChange(async (value) => {
						this.settings.displayOptions_ReplaceAddCreatedAt =
							value;
						await this.plugin.saveSettings();
					})
			);

		containerEl.createEl("h2", { text: t("Settings_Uptimer") });

		new Setting(containerEl)
			.setName(t("Settings_Uptimer_UpTimerEmail"))
			.addText((text) =>
				text
					.setValue(this.settings.uptimer.email ?? "")
					.onChange(async (value) => {
						console.log("Secret: " + value);
						this.settings.uptimer.email = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(t("Settings_Uptimer_UpTimerPassword"))
			.addText((text) =>
				text
					.setValue(this.settings.uptimer.password ?? "")
					.onChange(async (value) => {
						this.settings.uptimer.password = value;
						await this.plugin.saveSettings();
					})
			);

		containerEl.createEl("h2", { text: t("Settings_JournalFormatting") });
		new Setting(containerEl)
			.setName(t("Settings_JournalFormatting_PeriodicNotes"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.settings.diary.stayWithPN)
					.onChange(async (value) => {
						if (value) {
							// @ts-ignore
							const PNsetting =
								// @ts-ignore
								app.plugins.plugins["periodic-notes"];
							if (PNsetting) {
								const { format, folder } =
									PNsetting.settings.daily;
								this.settings.diary = {
									format,
									folder,
									stayWithPN: true,
								};
								console.log(
									"🚀 ~ this.settings.diary",
									this.settings.diary
								);
								await this.plugin.saveSettings();
								this.display();
							} else {
								new Notice("Periodic Notes 中未设置");
								this.display();
							}
						} else {
							this.settings.diary.stayWithPN = false;
							await this.plugin.saveSettings();
							this.display();
						}
					})
			);

		const dateFormat = new Setting(containerEl)
			.setName(t("Settings_JournalFormatting_DateFormat"))
			.setDesc(
				`${t("Settings_JournalFormatting_DateFormatDescription")}  ${
					!this.settings.diary.format
						? ""
						: window.moment().format(this.settings.diary.format)
				}`
			)
			.addText((text) =>
				text
					.setValue(this.settings.diary.format)
					.onChange(async (value) => {
						this.settings.diary.format = value;
						dateFormat.setDesc(
							`${t(
								"Settings_JournalFormatting_DateFormatDescription"
							)}  ${
								!this.settings.diary.format
									? ""
									: window
											.moment()
											.format(this.settings.diary.format)
							}`
						);
						await this.plugin.saveSettings();
					})
			)
			.setDisabled(this.settings.diary.stayWithPN);

		new Setting(containerEl)
			.setName(t("Settings_JournalFormatting_Folder"))
			.setDesc(t("Settings_JournalFormatting_FolderDescription"))
			.addText((text) =>
				text
					.setValue(this.settings.diary.folder)
					.onChange(async (value) => {
						this.settings.diary.format = value;
						await this.plugin.saveSettings();
					})
			)
			.setDisabled(this.settings.diary.stayWithPN);
	}

	async hide() {
		const listName = this.settings.todoListSync.listName;
		const email = this.settings.uptimer.email;
		const password = this.settings.uptimer.password;

		if (this.settings.todoListSync.listId != undefined || !listName) {
			if (!listName) new Notice("微软同步列表未设置");
		} else {
			let listId = await this.plugin.todoApi.getListIdByName(listName);
			if (!listId) {
				listId = (await this.plugin.todoApi.createTaskList(listName))
					?.id;
			}
			if (!listId) {
				new Notice("创建列表失败");
				return;
			} else {
				this.settings.todoListSync = {
					listName,
					listId,
				};
				new Notice("设置同步列表成功√");
				await this.plugin.saveSettings();
			}
		}

		if (!this.settings.uptimer.token) {
			if (!email || !password) new Notice("uptimer未设置");
			else {
				const token = await getUptimerToken(email, password);
				if (!token) {
					new Notice("邮箱或密码错误");
				}
				this.settings.uptimer.token = token;
				new Notice("uptimer已配置完成√");
				await this.plugin.saveSettings();
			}
		}
	}
}