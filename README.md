# 💬 LinkUp

<div align="center">
  <img src="./public/LinkUp.png" alt="LinkUp Logo" width="200"/>
  
  ### Real-time Chat Application
  
  Connect, chat, and collaborate in real-time with LinkUp - a modern web-based chat platform built with Socket.IO
  
  [![Live Demo](https://img.shields.io/badge/demo-live-success?style=for-the-badge)](https://real-chat-application-5dxq.onrender.com)
  ![Made with Love](https://img.shields.io/badge/Made%20with-❤️-red?style=for-the-badge)
</div>

---

## ✨ Features

- 🚀 **Real-time Messaging** - Instant message delivery using WebSocket technology
- 👥 **Live User Tracking** - See who's online in real-time
- ✍️ **Typing Indicators** - Know when someone is composing a message
- 🎨 **Color-coded Users** - Each user gets a unique color for easy identification
- 🔔 **Sound Notifications** - Audio alerts for new messages
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- ⚡ **Auto-reconnection** - Automatically reconnects if connection drops
- 🕐 **Message Timestamps** - Track when messages were sent
- 🎭 **User Join/Leave Notifications** - System messages for user activity
- 💬 **Clean UI** - Modern, intuitive interface with smooth animations

## 🛠️ Tech Stack

- **Frontend:**
  - HTML5
  - CSS3 with Bootstrap 5
  - JavaScript (jQuery)
  - Socket.IO Client

- **Backend:**
  - Node.js
  - Socket.IO Server
  - Express.js (assumed)

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/linkup.git
cd linkup
```

2. Install dependencies
```bash
npm install
```

3. Configure backend URL
```javascript
// In the HTML file, update the BACKEND_URL
var BACKEND_URL = 'your-backend-url-here';
```

4. Start the application
```bash
npm start
```

5. Open your browser and navigate to `http://localhost:3000`

## 📖 Usage

1. **Enter Your Name** - When you first connect, you'll be prompted to enter your username
2. **Start Chatting** - Type your message and press Enter or click "Send Message"
3. **See Who's Online** - Check the "Online Users" panel on the left
4. **Watch for Typing** - See when other users are typing
5. **Stay Connected** - The app will automatically reconnect if your connection drops

## 🎯 Keyboard Shortcuts

- `Enter` - Send message
- `Shift + Enter` - New line in message

## 🌐 Live Demo

Check out the live version: [LinkUp Demo](https://real-chat-application-5dxq.onrender.com)

## 📸 Screenshots

### Chat Interface
![Chat Room](screenshots/chat-room.png)

### Online Users
![Online Users](screenshots/online-users.png)

## 🗺️ Roadmap

- [ ] Message reactions (👍❤️😂)
- [ ] User avatars with initials
- [ ] Dark mode toggle
- [ ] Private messaging (DMs)
- [ ] Multiple chat rooms
- [ ] Message editing and deletion
- [ ] File/image sharing
- [ ] Emoji picker
- [ ] @mentions
- [ ] Message persistence (database)
- [ ] User authentication
- [ ] Desktop notifications

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/yourprofile)

## 🙏 Acknowledgments

- Socket.IO for real-time communication
- Bootstrap for UI components
- jQuery for DOM manipulation
- All contributors and users of LinkUp

## 📞 Support

If you have any questions or need help, feel free to:
- Open an issue
- Contact me directly
- Join our community chat

---

<div align="center">
  Made with ❤️ by [Your Name]
  
  ⭐ Star this repo if you find it useful!
</div>
