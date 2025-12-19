## Đặc tả chức năng

### Volunteers
- Có thể xem những gì khi chưa đăng nhập (quan trọng)?
	- xem sự kiện
	- dashboard
	- profile
#### Login & Signup
- Có 2 phương thức đăng nhập: manual và qua google
- Các field cần thiết
	- Name
	- Email
	- Password
	- Birthdate
- Các luồng hoạt động
	- Tạo tài khoản -> gửi mã xác thực qua email -> đăng nhập
	- Quên mật khẩu -> gửi mã xác thực qua email -> đổi mật khẩu mới -> đăng nhập
#### Report
- Báo cáo sự kiện, posts vi phạm
- Luồng: nhấn nút báo cáo -> hiện ra một textbox để ghi lý do báo cáo

#### Xem sự kiện
- Luồng hoạt động: Click vào tab sự kiện -> hiển thị các sự kiện đã tham gia, đang tham gia và các sự kiện hiện tại còn có thể tham gia (sort newest, thành viên, deadline...) (filter: tags)
- Nếu chưa tham gia thì khi click sẽ chỉ hiện cái mô tả, yêu cầu, số thành viên hiện tại, thời gian, địa điểm và sẽ có 1 button để apply
	- Check max members, deadline, thời gian trùng các event
	- Public/private các thành viên đã tham gia
- Nếu đã tham gia rồi, thì khi truy cập sẽ hiển thị các posts, comments, reactions, pinned posts
	- Chỉ có event managers được quyền pin
	- Đăng bài
	- Mời bạn bè
	- Mention bạn bè trong comments
	- Rời sự kiện (chỉ trước thời điểm đăng ký)
#### Dashboard
- 3 tab: All, sự kiện chưa tham gia, sự kiện đã tham gia
- Sự kiện chưa tham gia
	1. Mô tả về sự kiện
	2. Sự kiện thu hút (tăng thành viên nhanh trong thời gian ngắn, trao đổi nhiều (posts, comments, reactions)),
	- tính năng Sort theo newest
- Sự kiện đã tham gia
	1. Các posts được react, comments nhiều...
	2. Posts từ admin (có thể là tất cả)
	- tính năng Sort theo newest
- All
	- thập cẩm từ 2 tab kia
#### Profile
- Dashboard dành cho profile (các sự kiện đã/đang tham gia)
	- Số sự kiện đã tham gia
	- line chart về các sự kiện đã tham gia
	- bar chart theo tags
	- ...
- Hiển thị danh sách bạn bè
- Tính năng kết bạn
- Customize notifications (dropped)
- Change password
#### Notifications
- Tham gia sự kiện thành công
- Một sự kiện nào đó bị hủy, sửa (tên, ngày, địa điểm, mô tả)
- Bị kick khỏi một sự kiện
- Kết bạn thành công/Users khác gửi kết bạn
- Được bạn bè mời tham gia sự kiện
- Được head manager mời lên làm submanager
- Thông báo khi có posts mới từ manager/user ở một sự kiện đang tham gia
- Thông báo khi được mention
- Thông báo khi report được thông qua
- Thông báo khi sự kiện sắp diễn ra (1 ngày)
### Event Managers
#### Login
#### Report
- Nhận và duyệt report về posts
#### Quản lý sự kiện
- Tạo/sửa/xóa sự kiện
	- Mời các manager vào làm manager phụ
	- Cập nhật trạng thái hoàn thành của sự kiện
	- Sửa (tên, ngày, địa điểm, mô tả)
- Duyệt/xóa thành viên
- Tính năng xóa posts/comments
- Tính năng duyệt posts
- Đăng bài public (cho dashboard)/private (chỉ ở trong nhóm)
- Xem danh sách tình nguyện viên tham gia sự kiện
- Post bài, comment, like trên kênh sự kiện (tương tự wall Facebook), chỉ sau khi sự kiện được duyệt.

#### Notifications
- Sự kiện được duyệt
- Được mời làm sub-manager cho sự kiện
- Thông báo khi có report mới
- Thông báo khi có posts cần duyệt
- Thông báo khi có thành viên cần được duyệt
- Thông báo khi sự kiện sắp diễn ra (1 ngày)
- 
### Admin
#### Login
#### Report
- Nhận report về sự kiện
#### Quản lý sự kiện
- Duyệt/xóa sự kiện
- Xem, khóa/mở tài khoản tình nguyện viên/quản lý sự kiện.
#### Xuất dữ liệu
- Export danh sách sự kiện/tình nguyện viên theo (CSV/JSON)
#### Notifications
- Thông báo khi có report mới
- Thông báo khi có sự kiện cần được duyệt
- Thông báo

### Ghi chú
- Post/mô tả sự kiện có thể bao gồm rich text, ảnh, video
- Làm 5 theme khác nhau, mỗi theme đều có version dark/light
- Implement tính năng chọn địa điểm trên google maps ở phần mô tả