# QR Code Generator

সম্পূর্ণ client-side QR Code Generator — কোনো backend/server লাগে না। প্লেইন HTML, CSS, JavaScript দিয়ে বানানো, তাই সরাসরি **GitHub Pages** এ চালানো যায়।

## Features

- QR টাইপ: Plain Text, URL/Website, WiFi, Contact (vCard), Email, Phone, SMS, Location
- Size/Resolution কাস্টমাইজ করা যায় — px, inch, cm, mm যেকোনো এককে (QR বর্গাকার বলে Width = Height স্বয়ংক্রিয়ভাবে মিলিয়ে রাখা হয়)
- QR কালার, ব্যাকগ্রাউন্ড কালার, Dot Style পরিবর্তন করা যায়
- মাঝে লোগো বসানো যায় (ঐচ্ছিক) — লোগো দিলে স্বয়ংক্রিয়ভাবে উচ্চতর Error Correction ব্যবহার হয়, যাতে স্ক্যান করতে সমস্যা না হয়
- Download ফরম্যাট: **PNG, JPG, SVG, PDF** — PDF এ ঠিক আপনার বেছে নেওয়া real-world সাইজেই (in/cm/mm) প্রিন্ট হবে
- কোনো মেয়াদ (expiry) নেই — QR কোড নিজের মধ্যেই সব তথ্য বহন করে, তাই সবসময় কাজ করবে
- বাংলা/ইউনিকোড টেক্সট এবং স্মার্ট quote/ড্যাশ (’ ‘ “ ” – — …) সঠিকভাবে এনকোড হয় — স্ক্যান করলে garbled/বক্স ক্যারেক্টার আসবে না

## GitHub Pages এ Deploy করার নিয়ম

1. এই ফোল্ডারের ফাইলগুলো (`index.html`, `style.css`, `script.js`) আপনার GitHub রিপোজিটরিতে push করুন।
2. রিপোর **Settings → Pages** এ যান।
3. **Source** এ `main` (বা `master`) branch এবং `/root` সিলেক্ট করে **Save** করুন।
4. কিছুক্ষণ পর `https://<your-username>.github.io/<repo-name>/` লিংকে সাইট লাইভ হয়ে যাবে।

## লোকালি চালানো

শুধু `index.html` ফাইলটা ব্রাউজারে খুললেই চলবে — কোনো build step বা npm install লাগবে না।

## ব্যবহৃত লাইব্রেরি (CDN থেকে লোড হয়)

- [qr-code-styling](https://github.com/kozakdenys/qr-code-styling) — QR কোড রেন্ডার ও PNG/JPG/SVG export
- [jsPDF](https://github.com/parallax/jsPDF) — PDF export
