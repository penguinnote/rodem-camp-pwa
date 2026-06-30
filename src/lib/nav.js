// 공지 상세로 이동할 때 항상 목록(/announcements)이 history에 먼저 쌓이게 한다.
// 그래야 상세에서 뒤로가기가 어디서 왔든 목록으로 돌아간다.
export function goToAnnouncement(navigate, currentPath, id) {
  if (currentPath === "/announcements") {
    navigate(`/announcements/${id}`);
  } else {
    navigate("/announcements");
    navigate(`/announcements/${id}`);
  }
}
