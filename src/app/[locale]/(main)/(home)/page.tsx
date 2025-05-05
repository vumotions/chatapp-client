'use client'

import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Textarea } from '~/components/ui/textarea'

const friends = [
  'Bảo Ngaan',
  'Adam Chu',
  'Việt Hải',
  'Thảo Nguyên',
  'Hoàng Tùng',
  'Nguyễn Mi An',
  'Lâm.T Bích Ngọc',
  'Anh Minh',
  'Bảo Thiên',
  'Nguyễn Tuấn Hưng',
  'Nguyễn Thị Mai',
  'Mỹ Tiên',
  'Trần Long'
]

const stories = ['Bạn', 'Vann Tienn', 'Quốc Đạt', 'Trà Trần', 'Lâm Lê', 'Lương Ngọc Hà']

function Home() {
  return (
    <div className='mx-auto flex max-w-screen-2xl flex-col gap-4 py-4 lg:flex-row'>
      {/* Main Content */}
      <div className='flex flex-1 flex-col gap-4'>
        {/* Status input */}
        <Card>
          <CardContent className='p-4'>
            <Textarea placeholder='Lê ơi, bạn đang nghĩ gì thế?' />
            <div className='mt-2 flex gap-2'>
              <Button variant='outline'>🎥 Video trực tiếp</Button>
              <Button variant='outline'>📷 Ảnh/video</Button>
              <Button variant='outline'>😊 Cảm xúc</Button>
            </div>
          </CardContent>
        </Card>

        {/* Stories */}
        <ScrollArea className='w-full whitespace-nowrap'>
          <div className='flex space-x-4 px-2'>
            {stories.map((name, idx) => (
              <div key={idx} className='flex flex-col items-center'>
                <Avatar className='h-16 w-16 border'>
                  <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className='mt-1 text-sm'>{name}</span>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Post */}
        <Card>
          <CardContent className='space-y-3 p-4'>
            <div className='flex items-center gap-3'>
              <Avatar className='h-10 w-10'>
                <AvatarImage src='https://i.pravatar.cc/100?img=45' />
                <AvatarFallback>K</AvatarFallback>
              </Avatar>
              <div>
                <p className='font-semibold'>Killua Zoldyck</p>
                <p className='text-muted-foreground text-xs'>40 phút trước</p>
              </div>
            </div>

            <p className='text-lg font-semibold'>Cần tìm người pass phòng hộ. Giá 500k</p>

            <div className='text-muted-foreground flex justify-between border-t pt-2 text-sm'>
              <Button variant='ghost' size='sm'>
                👍 Thích
              </Button>
              <Button variant='ghost' size='sm'>
                💬 Bình luận
              </Button>
              <Button variant='ghost' size='sm'>
                📤 Gửi
              </Button>
              <Button variant='ghost' size='sm'>
                🔗 Chia sẻ
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='space-y-3 p-4'>
            <div className='flex items-center gap-3'>
              <Avatar className='h-10 w-10'>
                <AvatarImage src='https://i.pravatar.cc/100?img=45' />
                <AvatarFallback>K</AvatarFallback>
              </Avatar>
              <div>
                <p className='font-semibold'>Killua Zoldyck</p>
                <p className='text-muted-foreground text-xs'>40 phút trước</p>
              </div>
            </div>

            <p className='text-lg font-semibold'>Cần tìm người pass phòng hộ. Giá 500k</p>

            <div className='text-muted-foreground flex justify-between border-t pt-2 text-sm'>
              <Button variant='ghost' size='sm'>
                👍 Thích
              </Button>
              <Button variant='ghost' size='sm'>
                💬 Bình luận
              </Button>
              <Button variant='ghost' size='sm'>
                📤 Gửi
              </Button>
              <Button variant='ghost' size='sm'>
                🔗 Chia sẻ
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='space-y-3 p-4'>
            <div className='flex items-center gap-3'>
              <Avatar className='h-10 w-10'>
                <AvatarImage src='https://i.pravatar.cc/100?img=45' />
                <AvatarFallback>K</AvatarFallback>
              </Avatar>
              <div>
                <p className='font-semibold'>Killua Zoldyck</p>
                <p className='text-muted-foreground text-xs'>40 phút trước</p>
              </div>
            </div>

            <p className='text-lg font-semibold'>Cần tìm người pass phòng hộ. Giá 500k</p>

            <div className='text-muted-foreground flex justify-between border-t pt-2 text-sm'>
              <Button variant='ghost' size='sm'>
                👍 Thích
              </Button>
              <Button variant='ghost' size='sm'>
                💬 Bình luận
              </Button>
              <Button variant='ghost' size='sm'>
                📤 Gửi
              </Button>
              <Button variant='ghost' size='sm'>
                🔗 Chia sẻ
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Sidebar (friends list) */}
      <div className='sticky top-[100px] hidden h-fit w-[250px] lg:block'>
        <Card>
          <CardContent className='p-4'>
            <h4 className='mb-2 font-semibold'>Người liên hệ</h4>
            <ScrollArea className='h-[70vh]'>
              <div className='space-y-2'>
                {friends.map((name, i) => (
                  <div key={i} className='flex items-center gap-2'>
                    <Avatar className='h-8 w-8'>
                      <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className='text-sm'>{name}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Home
