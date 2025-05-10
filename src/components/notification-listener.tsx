'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { useSocket } from '~/hooks/use-socket'
import SOCKET_EVENTS from '~/constants/socket-events'
import { useQueryClient } from '@tanstack/react-query'
import { NOTIFICATION_TYPE } from '~/constants/enums'

export default function NotificationListener() {
  const { socket } = useSocket()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!socket) return

    const handleNewNotification = (notification: any) => {
      console.log('New notification received in listener:', notification)
      
      // Invalidate notifications query để cập nhật notification popover
      queryClient.invalidateQueries({ queryKey: ['NOTIFICATIONS'] })
      
      // Thêm thông báo mới vào cache để hiển thị ngay lập tức
      queryClient.setQueryData(['NOTIFICATIONS'], (oldData: any) => {
        if (!oldData) {
          // Nếu chưa có dữ liệu, tạo cấu trúc mới
          return {
            pages: [
              {
                notifications: [notification],
                hasMore: false
              }
            ],
            pageParams: [undefined]
          };
        }
        
        // Tạo bản sao của dữ liệu cũ
        const newData = JSON.parse(JSON.stringify(oldData));
        
        // Đảm bảo cấu trúc dữ liệu đúng
        if (!newData.pages || !newData.pages[0]) {
          newData.pages = [{ notifications: [], hasMore: false }];
        }
        
        if (!newData.pages[0].notifications) {
          newData.pages[0].notifications = [];
        }
        
        // Kiểm tra xem thông báo đã tồn tại chưa
        const exists = newData.pages[0].notifications.some(
          (n: any) => n._id === notification._id
        );
        
        // Thêm thông báo mới vào đầu danh sách nếu chưa tồn tại
        if (!exists) {
          newData.pages[0].notifications.unshift(notification);
        }
        
        return newData;
      });
      
      // Hiển thị toast thông báo
      if (notification.type !== NOTIFICATION_TYPE.NEW_MESSAGE) {
        const senderName = notification.sender?.name || notification.senderId?.name || 'Ai đó';
        let message = 'Bạn có thông báo mới';
        
        switch (notification.type) {
          case NOTIFICATION_TYPE.FRIEND_REQUEST:
            message = `${senderName} đã gửi cho bạn lời mời kết bạn`;
            break;
          case NOTIFICATION_TYPE.FRIEND_ACCEPTED:
            message = `${senderName} đã chấp nhận lời mời kết bạn của bạn`;
            break;
        }
        
        toast(message, {
          description: 'Nhấp để xem chi tiết',
          action: {
            label: 'Xem',
            onClick: () => {
              // Mở popover thông báo hoặc chuyển hướng
              queryClient.invalidateQueries({ queryKey: ['NOTIFICATIONS'] });
            }
          }
        });
      }
    };

    // Đăng ký lắng nghe sự kiện thông báo mới
    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification)
    
    // Thêm log để kiểm tra socket đã kết nối

    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification)
    }
  }, [socket, queryClient])

  return null
}


