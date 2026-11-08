import type { Lang } from "@/lib/i18n";

export const LEGAL_UPDATED = "2026-11-08";
export const LEGAL_CONTACT = "community@themandarinleague.bond";

/** Google requires this sentence verbatim (English) for apps using Google user data. */
export const LIMITED_USE_STATEMENT =
  "The Mandarin League's use and transfer of information received from Google APIs to any other app will adhere to the Google API Services User Data Policy, including the Limited Use requirements.";
export const GOOGLE_USER_DATA_POLICY_URL =
  "https://developers.google.com/terms/api-services-user-data-policy";

export type LegalSection = {
  id: string; // anchor, same across languages
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalDoc = {
  title: string;
  updatedLabel: string; // "Cập nhật lần cuối" / "最后更新" / "Last updated"
  intro: string;
  sections: LegalSection[];
};

export const PRIVACY: Record<Lang, LegalDoc> = {
  vi: {
    title: "Chính sách quyền riêng tư",
    updatedLabel: "Cập nhật lần cuối",
    intro:
      "The Mandarin League (TML) vận hành website themandarinleague.bond cùng các cổng join.themandarinleague.bond và member.themandarinleague.bond. Chính sách này giải thích chúng tôi thu thập thông tin gì, dùng vào việc gì, chia sẻ với ai và bạn có những quyền gì.",
    sections: [
      {
        id: "collect",
        heading: "Thông tin chúng tôi thu thập",
        paragraphs: [
          "Chúng tôi chỉ thu thập thông tin bạn chủ động cung cấp hoặc cần thiết để vận hành các hoạt động của TML:",
        ],
        bullets: [
          "Khi bạn gửi biểu mẫu công khai (đăng ký tuyển thành viên, đăng ký khóa học hoặc hoạt động): họ tên, email, số điện thoại, ngày sinh, thông tin học tập hoặc công việc, câu trả lời và các tệp bạn tải lên như CV.",
          "Khi bạn tra cứu chứng nhận hoặc kết quả HSK: mã tra cứu và họ tên bạn nhập.",
          "Khi bạn là thành viên có tài khoản: hồ sơ thành viên (họ tên, ban, chức vụ, ảnh đại diện), nhiệm vụ, điểm đóng góp và thời điểm đăng nhập.",
          "Khi bạn liên kết tài khoản Google: mã tài khoản Google và địa chỉ email Google (xem mục Dữ liệu từ Google).",
          "Dữ liệu kỹ thuật lưu trên trình duyệt của bạn: phiên đăng nhập và các lựa chọn như ngôn ngữ, giao diện sáng/tối.",
        ],
      },
      {
        id: "google",
        heading: "Dữ liệu từ Google",
        paragraphs: [
          "Liên kết tài khoản Google (Đăng nhập với Google): khi thành viên bấm liên kết trong trang Cài đặt, chúng tôi chỉ nhận mã tài khoản Google và email đã được Google xác minh. Thông tin này chỉ dùng để nhận ra thành viên trong các buổi họp Google Meet nhằm điểm danh. Chúng tôi không đọc Gmail, Google Drive, Lịch hay danh bạ của bạn.",
          "Điểm danh Google Meet (quyền chỉ đọc meetings.space.readonly): chỉ khi người phụ trách chủ động bấm kết nối, hệ thống mới đọc danh sách các buổi họp mà tài khoản Google đó tổ chức hoặc tham dự, cùng danh sách người tham dự từng buổi (mã tài khoản Google, tên hiển thị, giờ bắt đầu và kết thúc). Chúng tôi không đọc nội dung cuộc họp, bản ghi âm, bản ghi hình, bản chép lời hay tin nhắn trò chuyện.",
          "Quyền truy cập Google Meet là mã truy cập ngắn hạn, chỉ nằm tạm trong trình duyệt của người chấm và được gửi kèm từng yêu cầu. Chúng tôi không lưu mã này. Sau khi chấm, chúng tôi chỉ lưu mã buổi họp, giờ bắt đầu và kết thúc, loại buổi họp, danh sách thành viên được điểm danh và người đã chấm.",
          "Dữ liệu nhận từ Google API không được bán, không dùng cho quảng cáo, không gửi cho bất kỳ dịch vụ AI nào, và không chia sẻ với bên thứ ba ngoài các nhà cung cấp hạ tầng nêu ở mục Bên cung cấp dịch vụ để vận hành chính tính năng này.",
        ],
      },
      {
        id: "use",
        heading: "Chúng tôi dùng thông tin để làm gì",
        paragraphs: [],
        bullets: [
          "Xét tuyển thành viên, sắp xếp lớp học và tổ chức hoạt động.",
          "Quản lý thành viên, giao nhiệm vụ, điểm danh và tính điểm đóng góp.",
          "Cấp và cho phép tra cứu chứng nhận, kết quả HSK.",
          "Gửi email thông báo kết quả đăng ký và các thông tin liên quan.",
          "Bảo vệ website khỏi spam và lạm dụng (Google reCAPTCHA trên các biểu mẫu công khai).",
        ],
      },
      {
        id: "processors",
        heading: "Bên cung cấp dịch vụ",
        paragraphs: [
          "Chúng tôi dùng các nhà cung cấp sau để vận hành website. Họ chỉ xử lý dữ liệu theo chỉ dẫn của chúng tôi:",
          "Chúng tôi không bán dữ liệu cá nhân.",
        ],
        bullets: [
          "Supabase: cơ sở dữ liệu, lưu tệp và đăng nhập.",
          "Vercel: máy chủ chạy website.",
          "Google: reCAPTCHA, Google Meet API, Đăng nhập với Google, và Gemini AI. Gemini được dùng để tóm tắt hồ sơ ứng viên và đọc giấy chứng nhận cho người quản trị, và để trả lời câu hỏi trong trợ lý TML AI. Hội thoại với TML AI không được chúng tôi lưu lại.",
          "Resend: gửi email.",
        ],
      },
      {
        id: "storage",
        heading: "Lưu trữ và bảo mật",
        paragraphs: [
          "Dữ liệu được lưu trên Supabase với phân quyền chặt chẽ: mỗi người chỉ xem được phần dữ liệu đúng với vai trò của mình. Tệp của ứng viên nằm trong kho riêng và chỉ mở được bằng đường dẫn tạm thời cho người có quyền.",
          "Chúng tôi giữ dữ liệu trong thời gian cần cho các mục đích nêu trên, hoặc cho tới khi bạn yêu cầu xóa. Lịch sử điểm đóng góp được giữ để đảm bảo minh bạch.",
        ],
      },
      {
        id: "rights",
        heading: "Quyền của bạn",
        paragraphs: [],
        bullets: [
          "Yêu cầu xem, sửa hoặc xóa thông tin cá nhân của bạn qua email {email}.",
          "Hủy liên kết Google bất kỳ lúc nào trong Cài đặt → Google Meet. Mã tài khoản và email Google sẽ bị xóa ngay.",
          "Thu hồi quyền đã cấp cho The Mandarin League tại https://myaccount.google.com/permissions.",
        ],
      },
      {
        id: "changes",
        heading: "Thay đổi chính sách",
        paragraphs: [
          "Khi chính sách thay đổi, chúng tôi cập nhật trang này và ngày cập nhật ở đầu trang.",
        ],
      },
      {
        id: "contact",
        heading: "Liên hệ",
        paragraphs: ["Mọi câu hỏi về quyền riêng tư, vui lòng gửi email tới {email}."],
      },
    ],
  },
  zh: {
    title: "隐私政策",
    updatedLabel: "最后更新",
    intro:
      "The Mandarin League（TML）运营网站 themandarinleague.bond 以及 join.themandarinleague.bond 和 member.themandarinleague.bond 两个门户。本政策说明我们收集哪些信息、如何使用、与谁共享，以及你拥有哪些权利。",
    sections: [
      {
        id: "collect",
        heading: "我们收集的信息",
        paragraphs: ["我们只收集你主动提供的信息，或运营 TML 活动所必需的信息："],
        bullets: [
          "当你提交公开表单（成员申请、课程或活动报名）时：姓名、电子邮箱、电话号码、出生日期、学习或工作信息、你的回答以及你上传的文件（如简历）。",
          "当你查询证书或 HSK 成绩时：你输入的查询码和姓名。",
          "当你是有账号的成员时：成员档案（姓名、部门、职位、头像）、任务、贡献积分和登录时间。",
          "当你关联 Google 账号时：Google 账号 ID 和 Google 电子邮箱地址（见“来自 Google 的数据”）。",
          "存储在你浏览器中的技术数据：登录会话，以及语言、明暗主题等选择。",
        ],
      },
      {
        id: "google",
        heading: "来自 Google 的数据",
        paragraphs: [
          "关联 Google 账号（使用 Google 登录）：当成员在“设置”中点击关联时，我们只接收 Google 账号 ID 和 Google 已验证的电子邮箱。这些信息仅用于在 Google Meet 会议中识别成员以进行点名。我们不会读取你的 Gmail、Google 云端硬盘、日历或通讯录。",
          "Google Meet 点名（只读权限 meetings.space.readonly）：只有当负责人员主动点击连接时，系统才会读取该 Google 账号组织或参加的会议列表，以及每场会议的参与者列表（Google 账号 ID、显示名称、开始和结束时间）。我们不会读取会议内容、录音、录像、文字记录或聊天消息。",
          "Google Meet 访问使用短期访问令牌，仅暂存在点名人员的浏览器中，并随每次请求发送。我们不保存该令牌。点名之后，我们只保存会议记录 ID、开始和结束时间、会议类型、被记分的成员名单以及点名操作人。",
          "从 Google API 获得的数据不会被出售，不会用于广告，不会发送给任何 AI 服务，也不会与第三方共享，除非是本功能运行所需、列于“服务提供商”部分的基础设施提供商。",
        ],
      },
      {
        id: "use",
        heading: "我们如何使用信息",
        paragraphs: [],
        bullets: [
          "审核成员申请、安排课程和组织活动。",
          "管理成员、分配任务、点名并记录贡献积分。",
          "颁发证书和 HSK 成绩，并支持查询。",
          "发送报名结果通知及相关信息。",
          "保护网站免受垃圾信息与滥用（公开表单上的 Google reCAPTCHA）。",
        ],
      },
      {
        id: "processors",
        heading: "服务提供商",
        paragraphs: [
          "我们使用以下提供商来运营网站。他们仅按照我们的指示处理数据：",
          "我们不会出售个人数据。",
        ],
        bullets: [
          "Supabase：数据库、文件存储和登录。",
          "Vercel：网站服务器托管。",
          "Google：reCAPTCHA、Google Meet API、使用 Google 登录以及 Gemini AI。Gemini 用于为管理员总结申请资料和读取证书，以及回答 TML AI 助手的问题。我们不保存与 TML AI 的对话。",
          "Resend：发送电子邮件。",
        ],
      },
      {
        id: "storage",
        heading: "存储与安全",
        paragraphs: [
          "数据存储在 Supabase，并采用严格的权限控制：每个人只能看到其角色允许的数据。申请人的文件存放在私有存储中，只有获得授权的人才能通过临时链接打开。",
          "我们会在实现上述目的所需的期间内保留数据，或直到你要求删除。贡献积分历史会被保留以确保透明。",
        ],
      },
      {
        id: "rights",
        heading: "你的权利",
        paragraphs: [],
        bullets: [
          "通过电子邮件 {email} 请求查看、更正或删除你的个人信息。",
          "随时在“设置 → Google Meet”中取消关联 Google。Google 账号 ID 和电子邮箱会立即删除。",
          "在 https://myaccount.google.com/permissions 撤销授予 The Mandarin League 的权限。",
        ],
      },
      {
        id: "changes",
        heading: "政策变更",
        paragraphs: ["当本政策变更时，我们会更新本页面以及页面顶部的更新日期。"],
      },
      {
        id: "contact",
        heading: "联系我们",
        paragraphs: ["如有任何隐私问题，请发送电子邮件至 {email}。"],
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    updatedLabel: "Last updated",
    intro:
      "The Mandarin League (TML) operates themandarinleague.bond and the join.themandarinleague.bond and member.themandarinleague.bond portals. This policy explains what information we collect, how we use it, who we share it with and what rights you have.",
    sections: [
      {
        id: "collect",
        heading: "Information we collect",
        paragraphs: [
          "We only collect information you choose to give us or that we need to run TML's activities:",
        ],
        bullets: [
          "When you submit a public form (membership application, course or activity registration): your name, email, phone number, date of birth, study or work details, your answers and files you upload such as a CV.",
          "When you look up a certificate or HSK result: the lookup code and the name you enter.",
          "When you are a member with an account: your member profile (name, department, position, avatar), tasks, contribution points and sign-in times.",
          "When you link a Google account: your Google account ID and Google email address (see Google user data).",
          "Technical data stored in your browser: your sign-in session and choices such as language and light/dark theme.",
        ],
      },
      {
        id: "google",
        heading: "Google user data",
        paragraphs: [
          "Linking a Google account (Sign in with Google): when a member links an account in Settings, we receive only the Google account ID and the email address Google has verified. We use them only to recognise members in Google Meet meetings for attendance. We do not read your Gmail, Google Drive, Calendar or contacts.",
          "Google Meet attendance (read-only scope meetings.space.readonly): only when a person in charge chooses to connect, the system reads the list of meetings that Google account organised or attended, and each meeting's participants (Google account ID, display name, start and end times). We do not read meeting content, audio or video recordings, transcripts or chat messages.",
          "Google Meet access uses a short-lived access token that stays in the scorer's browser and is sent with each request. We do not store this token. After scoring we store only the meeting record ID, its start and end times, the meeting type, the members credited and who scored it.",
          "Data received from Google APIs is never sold, never used for advertising, never sent to any AI service, and never shared with third parties other than the infrastructure providers listed under Service providers to run this feature.",
        ],
      },
      {
        id: "use",
        heading: "How we use information",
        paragraphs: [],
        bullets: [
          "To review membership applications, organise classes and run activities.",
          "To manage members, assign tasks, take attendance and keep contribution points.",
          "To issue certificates and HSK results and let people verify them.",
          "To send emails about the outcome of your registration and related updates.",
          "To protect the website from spam and abuse (Google reCAPTCHA on public forms).",
        ],
      },
      {
        id: "processors",
        heading: "Service providers",
        paragraphs: [
          "We use the following providers to run the website. They process data only on our instructions:",
          "We do not sell personal data.",
        ],
        bullets: [
          "Supabase: database, file storage and sign-in.",
          "Vercel: website hosting.",
          "Google: reCAPTCHA, the Google Meet API, Sign in with Google and Gemini AI. Gemini is used to summarise applications and read certificates for administrators, and to answer questions in the TML AI assistant. We do not store TML AI conversations.",
          "Resend: email delivery.",
        ],
      },
      {
        id: "storage",
        heading: "Storage and security",
        paragraphs: [
          "Data is stored in Supabase with strict access rules: each person sees only the data their role allows. Applicant files sit in private storage and open only through temporary links for authorised people.",
          "We keep data for as long as it is needed for the purposes above, or until you ask us to delete it. Contribution point history is kept for transparency.",
        ],
      },
      {
        id: "rights",
        heading: "Your rights",
        paragraphs: [],
        bullets: [
          "Ask to see, correct or delete your personal information by emailing {email}.",
          "Unlink your Google account at any time in Settings → Google Meet. Your Google account ID and email are deleted immediately.",
          "Revoke access granted to The Mandarin League at https://myaccount.google.com/permissions.",
        ],
      },
      {
        id: "changes",
        heading: "Changes to this policy",
        paragraphs: ["When this policy changes, we update this page and the date at the top."],
      },
      {
        id: "contact",
        heading: "Contact",
        paragraphs: ["For any privacy question, email {email}."],
      },
    ],
  },
};

export const TERMS: Record<Lang, LegalDoc> = {
  vi: {
    title: "Điều khoản sử dụng",
    updatedLabel: "Cập nhật lần cuối",
    intro:
      "Điều khoản này áp dụng khi bạn sử dụng website themandarinleague.bond và các cổng join.themandarinleague.bond, member.themandarinleague.bond do The Mandarin League (TML) vận hành. Khi sử dụng website, bạn đồng ý với điều khoản này và với {privacy}.",
    sections: [
      {
        id: "services",
        heading: "Dịch vụ",
        paragraphs: [
          "Website giới thiệu TML; nhận đăng ký tuyển thành viên, khóa học và hoạt động; cho phép tra cứu chứng nhận và kết quả HSK; có trợ lý hỏi đáp TML AI; và có cổng nội bộ dành cho thành viên.",
          "TML có thể thay đổi, tạm dừng hoặc ngừng một tính năng bất kỳ lúc nào.",
        ],
      },
      {
        id: "accounts",
        heading: "Tài khoản thành viên",
        paragraphs: [],
        bullets: [
          "Tài khoản do TML cấp cho thành viên, website không mở đăng ký công khai.",
          "Bạn chịu trách nhiệm giữ bí mật mật khẩu và không chia sẻ tài khoản cho người khác.",
          "TML có thể tạm khóa hoặc vô hiệu hóa tài khoản khi bạn vi phạm điều khoản này hoặc không còn là thành viên.",
        ],
      },
      {
        id: "conduct",
        heading: "Quy tắc sử dụng",
        paragraphs: ["Khi sử dụng website, bạn đồng ý:"],
        bullets: [
          "Cung cấp thông tin trung thực trong các biểu mẫu và hồ sơ.",
          "Không mạo danh người khác, không đăng nội dung vi phạm pháp luật hoặc xúc phạm người khác.",
          "Không tấn công, dò quét lỗ hổng, gửi biểu mẫu tự động hoặc cố tình làm gián đoạn website.",
          "Không gian lận trong điểm danh, nhiệm vụ hay điểm đóng góp.",
        ],
      },
      {
        id: "content",
        heading: "Nội dung và quyền sở hữu",
        paragraphs: [
          "Nội dung, logo và tài liệu trên website thuộc TML hoặc đối tác của TML. Bạn không được sao chép cho mục đích thương mại khi chưa có sự đồng ý.",
          "Bạn giữ quyền đối với nội dung bạn gửi. Bạn cho phép TML sử dụng nội dung đó trong phạm vi cần thiết để xử lý đăng ký và tổ chức hoạt động.",
        ],
      },
      {
        id: "ai",
        heading: "Trợ lý TML AI",
        paragraphs: [
          "Câu trả lời của TML AI chỉ mang tính tham khảo và có thể chưa chính xác. Thông tin chính thức là thông báo của TML.",
        ],
      },
      {
        id: "google",
        heading: "Dịch vụ của Google",
        paragraphs: [
          "Tính năng liên kết Google và điểm danh Google Meet dùng dịch vụ của Google và cũng tuân theo điều khoản của Google. Bạn có thể hủy liên kết Google bất kỳ lúc nào trong Cài đặt → Google Meet. Cách chúng tôi xử lý dữ liệu từ Google được nêu trong {privacy}.",
        ],
      },
      {
        id: "liability",
        heading: "Giới hạn trách nhiệm",
        paragraphs: [
          "Website được cung cấp theo hiện trạng. TML cố gắng giữ website hoạt động ổn định nhưng không bảo đảm website luôn không bị gián đoạn hay không có lỗi. Trong phạm vi pháp luật cho phép, TML không chịu trách nhiệm cho thiệt hại gián tiếp phát sinh từ việc sử dụng website.",
        ],
      },
      {
        id: "changes",
        heading: "Thay đổi điều khoản",
        paragraphs: [
          "Khi điều khoản thay đổi, chúng tôi cập nhật trang này và ngày cập nhật ở đầu trang. Việc bạn tiếp tục sử dụng website nghĩa là bạn đồng ý với điều khoản mới.",
        ],
      },
      {
        id: "contact",
        heading: "Liên hệ",
        paragraphs: ["Mọi câu hỏi về điều khoản, vui lòng gửi email tới {email}."],
      },
    ],
  },
  zh: {
    title: "使用条款",
    updatedLabel: "最后更新",
    intro:
      "本条款适用于你使用由 The Mandarin League（TML）运营的 themandarinleague.bond 网站以及 join.themandarinleague.bond、member.themandarinleague.bond 门户。使用本网站即表示你同意本条款以及我们的 {privacy}。",
    sections: [
      {
        id: "services",
        heading: "服务",
        paragraphs: [
          "本网站介绍 TML；接收成员申请、课程和活动报名；支持查询证书与 HSK 成绩；提供 TML AI 问答助手；并为成员提供内部门户。",
          "TML 可随时更改、暂停或停止任何功能。",
        ],
      },
      {
        id: "accounts",
        heading: "成员账号",
        paragraphs: [],
        bullets: [
          "账号由 TML 发放给成员，网站不开放公开注册。",
          "你有责任保管好密码，不得与他人共享账号。",
          "若你违反本条款或不再是成员，TML 可暂停或停用你的账号。",
        ],
      },
      {
        id: "conduct",
        heading: "使用规范",
        paragraphs: ["使用本网站时，你同意："],
        bullets: [
          "在表单和档案中提供真实信息。",
          "不冒充他人，不发布违法或侮辱他人的内容。",
          "不攻击、扫描漏洞、自动提交表单或故意干扰网站。",
          "不在点名、任务或贡献积分中作弊。",
        ],
      },
      {
        id: "content",
        heading: "内容与所有权",
        paragraphs: [
          "本网站的内容、标识和资料属于 TML 或其合作伙伴。未经同意，你不得为商业目的复制。",
          "你保留你提交内容的权利。你允许 TML 在办理报名和组织活动所需的范围内使用这些内容。",
        ],
      },
      {
        id: "ai",
        heading: "TML AI 助手",
        paragraphs: ["TML AI 的回答仅供参考，可能不准确。以 TML 的正式公告为准。"],
      },
      {
        id: "google",
        heading: "Google 服务",
        paragraphs: [
          "Google 账号关联和 Google Meet 点名依赖 Google 服务，也须遵守 Google 的条款。你可以随时在“设置 → Google Meet”中取消关联。我们如何处理来自 Google 的数据见 {privacy}。",
        ],
      },
      {
        id: "liability",
        heading: "责任限制",
        paragraphs: [
          "本网站按现状提供。TML 努力保持网站稳定运行，但不保证网站不会中断或没有错误。在法律允许的范围内，TML 不对因使用本网站而产生的间接损失承担责任。",
        ],
      },
      {
        id: "changes",
        heading: "条款变更",
        paragraphs: [
          "当本条款变更时，我们会更新本页面以及页面顶部的更新日期。你继续使用本网站即表示接受新的条款。",
        ],
      },
      {
        id: "contact",
        heading: "联系我们",
        paragraphs: ["如对本条款有任何疑问，请发送电子邮件至 {email}。"],
      },
    ],
  },
  en: {
    title: "Terms of Service",
    updatedLabel: "Last updated",
    intro:
      "These terms apply when you use themandarinleague.bond and the join.themandarinleague.bond and member.themandarinleague.bond portals operated by The Mandarin League (TML). By using the website you agree to these terms and to our {privacy}.",
    sections: [
      {
        id: "services",
        heading: "Services",
        paragraphs: [
          "The website introduces TML; accepts membership applications and course and activity registrations; lets people verify certificates and HSK results; offers the TML AI question-answering assistant; and provides an internal portal for members.",
          "TML may change, pause or discontinue any feature at any time.",
        ],
      },
      {
        id: "accounts",
        heading: "Member accounts",
        paragraphs: [],
        bullets: [
          "Accounts are issued by TML to its members; there is no public sign-up.",
          "You are responsible for keeping your password secret and must not share your account.",
          "TML may suspend or disable an account that breaks these terms or that no longer belongs to a member.",
        ],
      },
      {
        id: "conduct",
        heading: "Acceptable use",
        paragraphs: ["When using the website you agree to:"],
        bullets: [
          "Give truthful information in forms and profiles.",
          "Not impersonate anyone or post unlawful or abusive content.",
          "Not attack, scan for vulnerabilities, submit forms automatically or deliberately disrupt the website.",
          "Not cheat on attendance, tasks or contribution points.",
        ],
      },
      {
        id: "content",
        heading: "Content and ownership",
        paragraphs: [
          "Content, logos and materials on the website belong to TML or its partners. You may not copy them for commercial purposes without permission.",
          "You keep the rights to what you submit. You allow TML to use it as needed to process registrations and run activities.",
        ],
      },
      {
        id: "ai",
        heading: "TML AI assistant",
        paragraphs: [
          "Answers from TML AI are for reference only and may be inaccurate. TML's official announcements prevail.",
        ],
      },
      {
        id: "google",
        heading: "Google services",
        paragraphs: [
          "Google account linking and Google Meet attendance rely on Google services and are also subject to Google's terms. You can unlink your Google account at any time in Settings → Google Meet. How we handle Google user data is described in our {privacy}.",
        ],
      },
      {
        id: "liability",
        heading: "Limitation of liability",
        paragraphs: [
          "The website is provided as is. TML works to keep it stable but does not guarantee it will be uninterrupted or error-free. To the extent permitted by law, TML is not liable for indirect damages arising from use of the website.",
        ],
      },
      {
        id: "changes",
        heading: "Changes to these terms",
        paragraphs: [
          "When these terms change, we update this page and the date at the top. Continuing to use the website means you accept the updated terms.",
        ],
      },
      {
        id: "contact",
        heading: "Contact",
        paragraphs: ["For any question about these terms, email {email}."],
      },
    ],
  },
};
