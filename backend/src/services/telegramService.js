const TelegramBot = require('node-telegram-bot-api');
const User = require('../models/User');
const TelegramLinkCode = require('../models/TelegramLinkCode');

class TelegramService {
  constructor() {
    this.bot = null;
  }

  init() {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.warn('[TelegramService] TELEGRAM_BOT_TOKEN not configured, Telegram features disabled');
      return;
    }

    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    this.setupHandlers();
    console.log('[TelegramService] Telegram bot initialized');
  }

  setupHandlers() {
    // Handle /start command with linking code
    this.bot.onText(/\/start (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const linkCode = match[1];

      try {
        const linkDoc = await TelegramLinkCode.findOne({
          code: linkCode,
          expiresAt: { $gt: new Date() }
        });

        if (!linkDoc) {
          await this.bot.sendMessage(chatId,
            'Invalid or expired linking code. Please generate a new code from the web app.');
          return;
        }

        // Check if this Telegram account is already linked to another user
        const existingUser = await User.findOne({ 'settings.telegram.chatId': chatId.toString() });
        if (existingUser && existingUser._id.toString() !== linkDoc.user.toString()) {
          await this.bot.sendMessage(chatId,
            'This Telegram account is already linked to another user. Please unlink it first.');
          return;
        }

        // Link the Telegram account
        await User.findByIdAndUpdate(linkDoc.user, {
          'settings.telegram.chatId': chatId.toString(),
          'settings.telegram.isLinked': true,
          'settings.telegram.linkedAt': new Date()
        });

        // Delete the used link code
        await TelegramLinkCode.deleteOne({ _id: linkDoc._id });

        // Get user for personalized message
        const user = await User.findById(linkDoc.user);

        await this.bot.sendMessage(chatId,
          `Welcome, ${user.username}! Your Telegram account has been linked successfully.\n\n` +
          `You will now receive reminders before matches start (if you haven't placed a bet).\n\n` +
          `Commands:\n` +
          `/status - Check your connection status\n` +
          `/help - Show available commands`
        );
      } catch (error) {
        console.error('[TelegramService] Error linking account:', error);
        await this.bot.sendMessage(chatId, 'An error occurred. Please try again.');
      }
    });

    // Handle plain /start command
    this.bot.onText(/^\/start$/, async (msg) => {
      const chatId = msg.chat.id;
      await this.bot.sendMessage(chatId,
        'Welcome to Football Betting Bot!\n\n' +
        'To link your account, please go to the web app settings page and generate a linking code.\n\n' +
        'Then send: /start <your-code>'
      );
    });

    // Handle /status command
    this.bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id;
      const user = await User.findOne({ 'settings.telegram.chatId': chatId.toString() });

      if (user) {
        const settings = user.settings.telegram;
        await this.bot.sendMessage(chatId,
          `Linked to: ${user.username}\n` +
          `Reminders: ${settings.reminderEnabled ? 'Enabled' : 'Disabled'}\n` +
          `Reminder timing: ${settings.reminderMinutes} minutes before match`
        );
      } else {
        await this.bot.sendMessage(chatId,
          'Your Telegram account is not linked to any user.\n' +
          'Please generate a linking code from the web app.'
        );
      }
    });

    // Handle /help command
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      await this.bot.sendMessage(chatId,
        'Available commands:\n\n' +
        '/start <code> - Link your account\n' +
        '/status - Check connection status\n' +
        '/help - Show this message\n\n' +
        'To change reminder settings, visit the web app profile page.'
      );
    });
  }

  async sendReminder(chatId, matches, language = 'en') {
    if (!this.bot) return false;

    try {
      const messages = {
        en: {
          header: 'Bet Reminder!',
          intro: 'You have not placed bets on the following matches starting soon:',
          suffix: 'Place your bets before the matches start!'
        },
        he: {
          header: 'תזכורת להימור!',
          intro: 'לא שמת הימורים על המשחקים הבאים שמתחילים בקרוב:',
          suffix: 'שים את ההימורים שלך לפני שהמשחקים מתחילים!'
        }
      };

      const msg = messages[language] || messages.en;

      let text = `*${msg.header}*\n\n${msg.intro}\n\n`;

      for (const match of matches) {
        const matchTime = new Date(match.matchDate).toLocaleTimeString(
          language === 'he' ? 'he-IL' : 'en-US',
          { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' }
        );
        text += `${match.homeTeam} vs ${match.awayTeam} - ${matchTime}\n`;
        text += `Groups: ${match.groupNames.join(', ')}\n\n`;
      }

      text += msg.suffix;

      await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
      return true;
    } catch (error) {
      console.error('[TelegramService] Error sending reminder:', error);
      return false;
    }
  }

  async sendMessage(chatId, message) {
    if (!this.bot) return false;
    try {
      await this.bot.sendMessage(chatId, message);
      return true;
    } catch (error) {
      console.error('[TelegramService] Error sending message:', error);
      return false;
    }
  }
}

const telegramService = new TelegramService();
module.exports = telegramService;
