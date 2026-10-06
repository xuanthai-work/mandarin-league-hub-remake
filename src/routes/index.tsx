import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, Clock, Video, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CONTACT, TAGLINE } from '@/components/site/SiteLayout';
import { DemoBadge } from '@/components/site/ui';
import { ActivityGallery } from '@/components/site/ActivityGallery';
import { galleryQueryOptions } from '@/lib/data/gallery';
import { getCourses } from '@/lib/data/courses';
import { getActivities } from '@/lib/data/activities';
import { pageMeta } from '@/lib/seo';

export const Route = createFileRoute('/')({
  head: () => ({ meta: pageMeta('The Mandarin League – Liên Đoàn Hán Ngữ', 'Cộng đồng học tiếng Trung trực tuyến kết nối người học, giáo viên và cơ hội giữa Việt Nam và Trung Quốc. Khóa học HSK, hoạt động văn hóa và tuyển thành viên TML.') }),
  loader: ({ context }) => context.queryClient.ensureQueryData(galleryQueryOptions),
  component: Home,
});

function Home() {
  return <>
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-5 pb-14 pt-14 md:px-8 md:pb-16 md:pt-20">
        <p className="mb-5 text-xs font-semibold uppercase text-muted-foreground">Online Chinese Learning Community</p>
        <div className="mb-6 h-1 w-12 bg-gold" />
        <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-primary-deep md:text-6xl">The Mandarin League</h1>
        <p className="mt-4 text-xl font-medium text-primary-deep md:text-2xl">Liên Đoàn Hán Ngữ <span className="mx-2 text-border">/</span> <span className="font-han">普通话联盟</span></p>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">Cộng đồng học tiếng Trung trực tuyến dành cho người Việt — học HSK bài bản, giao lưu văn hóa và cùng nhau phát triển.</p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{TAGLINE}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg"><Link to="/join">Tham gia TML <ArrowRight /></Link></Button>
          <Button asChild variant="outline" size="lg"><Link to="/courses/hsk">Xem khóa học HSK</Link></Button>
        </div>
      </div>
    </section>
    <ActivityGallery />
    <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
      <div className="grid gap-8 md:grid-cols-[1fr_1.2fr] md:gap-20">
        <div><Label>Về TML</Label><h2 className="mt-4 text-2xl font-semibold leading-snug text-primary-deep md:text-3xl">Học tiếng Trung cùng một cộng đồng thực thụ</h2></div>
        <div className="space-y-4 text-base leading-relaxed text-muted-foreground"><p>The Mandarin League là tổ chức cộng đồng phi lợi nhuận, quy tụ các bạn trẻ yêu thích tiếng Trung và văn hóa Trung Hoa, hoạt động hoàn toàn trực tuyến.</p><p>Chúng tôi tổ chức khóa học HSK, workshop, cuộc thi và các dự án sáng tạo nội dung, giúp mỗi thành viên vừa học vừa trải nghiệm.</p><Button asChild variant="link" className="h-auto p-0"><Link to="/about">Tìm hiểu về TML <ArrowRight /></Link></Button></div>
      </div>
      <div className="mt-12 grid gap-6 border-t border-border pt-8 sm:grid-cols-3">{[{ value: 'HSK 1–6', label: 'Lộ trình học tiếng Trung' }, { value: 'Việt Nam × Trung Quốc', label: 'Kết nối ngôn ngữ và văn hóa' }, { value: 'Trực tuyến', label: 'Học tập và hoạt động cộng đồng' }].map(item => <div key={item.value}><h3 className="text-lg font-semibold text-primary-deep">{item.value}</h3><p className="mt-2 text-sm text-muted-foreground">{item.label}</p></div>)}</div>
    </section>
    <section className="border-y border-border bg-secondary py-14 md:py-20"><div className="mx-auto max-w-7xl px-5 md:px-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4"><div className="min-w-0"><Label>Khóa học HSK</Label><h2 className="mt-4 text-2xl font-semibold text-primary-deep md:text-3xl">Lộ trình phù hợp với bạn</h2></div><Button asChild variant="link" className="hidden sm:inline-flex"><Link to="/courses/hsk">Tất cả khóa học <ArrowRight /></Link></Button></div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{getCourses().slice(0,4).map(c => <article key={c.id} className="border border-border bg-card p-6"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-primary-deep">HSK {c.level}</span><DemoBadge /></div><h3 className="mt-5 text-lg font-semibold">{c.name}</h3><div className="mt-5 space-y-2 text-sm text-muted-foreground"><p className="flex items-center gap-2"><Clock className="h-4 w-4" />{c.sessions} buổi</p><p className="flex items-center gap-2"><Video className="h-4 w-4" />{c.mode}</p></div><Button asChild variant="link" className="mt-6 h-auto p-0"><Link to="/courses/hsk/$courseId" params={{courseId: c.id}}>Xem khóa học <ArrowRight /></Link></Button></article>)}</div>
    </div></section>
    <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20"><div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4"><div className="min-w-0"><Label>Hoạt động</Label><h2 className="mt-4 text-2xl font-semibold text-primary-deep md:text-3xl">Học qua trải nghiệm</h2></div><Button asChild variant="link" className="hidden sm:inline-flex"><Link to="/activities">Xem tất cả <ArrowRight /></Link></Button></div><div className="mt-8 grid gap-7 md:grid-cols-3">{getActivities().slice(0,3).map(a => <article key={a.id} className="border-t-2 border-gold pt-5"><div className="flex items-center gap-3"><span className="text-xs font-semibold text-muted-foreground">{a.type}</span><DemoBadge /></div><h3 className="mt-4 text-lg font-semibold leading-snug text-primary-deep"><Link to="/activities/$activityId" params={{ activityId: a.id }} className="hover:underline">{a.title}</Link></h3><p className="mt-3 text-sm text-muted-foreground">{a.description}</p><Button asChild variant="link" className="mt-4 h-auto p-0"><Link to="/activities/$activityId" params={{ activityId: a.id }}>Chi tiết <ArrowRight /></Link></Button></article>)}</div></section>
    <section className="border-y border-border bg-secondary"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 md:grid-cols-[1.4fr_1fr] md:px-8"><div><h2 className="text-2xl font-semibold text-primary-deep md:text-3xl">Trở thành một phần của TML</h2><p className="mt-4 max-w-lg text-muted-foreground">Học hỏi kỹ năng mới và cùng lan tỏa tình yêu tiếng Trung.</p><Button asChild className="mt-6"><Link to="/join">Ứng tuyển vào TML <ArrowRight /></Link></Button></div><div className="min-w-0 border-t border-border pt-6 md:border-l md:border-t-0 md:pl-8"><Label>Liên hệ</Label><a href={`mailto:${CONTACT.email}`} className="mt-4 flex min-w-0 items-start gap-3 text-sm text-primary-deep hover:underline"><Mail className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0 break-all">{CONTACT.email}</span></a></div></div></section>
  </>;
}
function Label({ children }: { children: React.ReactNode }) { return <p className="text-xs font-semibold uppercase text-muted-foreground">{children}</p>; }
