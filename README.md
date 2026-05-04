# PR Approval App

ระบบติดตามเอกสาร PR / Purchase Request แบบใช้งานได้ทันทีผ่านหน้าเว็บ static app

## จุดเด่น

- ไม่ต้องติดตั้งโปรแกรมเพิ่ม
- ไม่ต้องมี server
- ใช้ GitHub Pages เปิดใช้งานได้
- เก็บข้อมูลใน browser ด้วย localStorage
- สร้าง PR, อนุมัติ, ปฏิเสธ, ปิดงาน และดู dashboard ได้
- Export ข้อมูลเป็น CSV ได้
- มีข้อมูลตัวอย่างให้ทดลองทันที

## วิธีเปิดใช้งานแบบง่ายที่สุด

1. ไปที่ Repository Settings
2. เลือก Pages
3. Source: Deploy from a branch
4. Branch: main
5. Folder: /root
6. กด Save
7. รอสักครู่ แล้วเปิด URL ที่ GitHub Pages แสดงให้

URL มักจะเป็นรูปแบบนี้:

```text
https://sittipong-code.github.io/PR-approval-app/
```

## การใช้งาน

เปิดหน้าเว็บแล้วใช้งานได้ทันที:

- สร้าง PR ใหม่
- ดูสถานะเอกสาร
- กดอนุมัติ / ไม่อนุมัติ
- ปิดงานเมื่อซื้อเสร็จ
- ค้นหาเอกสาร
- Export CSV

## หมายเหตุสำคัญ

เวอร์ชันนี้เป็น MVP ที่เก็บข้อมูลใน browser ของผู้ใช้แต่ละเครื่อง เหมาะสำหรับทดลอง workflow และใช้งานส่วนตัว/ทีมเล็กมาก ถ้าต้องการใช้จริงหลายคนพร้อมกัน ควรอัปเกรด backend เป็น Google Sheet, Firebase หรือ Supabase

## โครงสร้างไฟล์

```text
index.html
styles.css
app.js
README.md
```

## Roadmap

- Google Sheet sync
- Login และ role permission
- Email / LINE notification
- PDF export
- Approval rule ตามวงเงิน
- Audit log แบบ cloud database
