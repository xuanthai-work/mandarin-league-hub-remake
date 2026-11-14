import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTr } from "@/lib/i18n";
import { useSiteContent } from "@/lib/site-content";
import type { Course } from "@/lib/data/types";
import type { HskClass } from "@/lib/hsk-classes";
import type { PublicTeacher } from "@/lib/teachers";
import type { ActivityRow } from "@/lib/activities";
import type { NewsRow } from "@/lib/news-db";
import { OrgChartSection } from "@/components/site/OrgChartSection";
import {
  ActivityDialog,
  CourseDialog,
  NewsDialog,
  TeacherDialog,
  VerifyDialog,
} from "@/components/site/LandingDialogs";
import { HeroSection } from "@/components/site/landing/HeroSection";
import { AboutSection } from "@/components/site/landing/AboutSection";
import { CoursesSection } from "@/components/site/landing/CoursesSection";
import { TeachersSection } from "@/components/site/landing/TeachersSection";
import { ActivitiesSection } from "@/components/site/landing/ActivitiesSection";
import { PartnersSection } from "@/components/site/landing/PartnersSection";
import { VerifySection } from "@/components/site/landing/VerifySection";
import { ContactSection } from "@/components/site/landing/ContactSection";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "The Mandarin League | Liên Đoàn Hán Ngữ" },
      {
        name: "description",
        content:
          "Cộng đồng học tiếng Trung trực tuyến: khóa học HSK, workshop, cuộc thi và hoạt động cộng đồng.",
      },
      { property: "og:title", content: "The Mandarin League | Liên Đoàn Hán Ngữ" },
      {
        property: "og:description",
        content:
          "Cộng đồng học tiếng Trung trực tuyến: khóa học HSK, workshop, cuộc thi và hoạt động cộng đồng.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const tr = useTr();
  const { data: h, preview } = useSiteContent("home");
  const site = useSiteContent("site").data;

  const [selectedCourse, setSelectedCourse] = useState<{
    course: Course;
    cls?: HskClass;
  } | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<PublicTeacher | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityRow | null>(null);
  const [selectedNews, setSelectedNews] = useState<NewsRow | null>(null);
  const [verifyKind, setVerifyKind] = useState<"certificate" | "hsk" | null>(null);

  return (
    <>
      {preview && (
        <div className="bg-gold/20 py-2 text-center text-sm font-semibold text-primary-deep">
          {tr("Đang xem trước bản nháp — khách truy cập chưa thấy nội dung này.")}
        </div>
      )}

      {/* Hero */}
      <HeroSection h={h} />

      {/* About: mission, values and community groups */}
      {h.show.about && <AboutSection h={h} />}

      {/* Organization: the exact SVG chart + per-department drawer from /organization */}
      <OrgChartSection id="organization" heading />

      {/* Courses: HSK classes with level filter, format, seats and fee (or the 1–6 roadmap) */}
      {h.show.courses && <CoursesSection h={h} onSelectCourse={setSelectedCourse} />}

      {/* Faculty — medium cards balance presence and page height */}
      <TeachersSection h={h} onSelectTeacher={setSelectedTeacher} />

      {/* Activities: category chips, activity cards and the photo carousel */}
      {h.show.activities && (
        <ActivitiesSection
          h={h}
          onSelectActivity={setSelectedActivity}
          onSelectNews={setSelectedNews}
        />
      )}

      {/* Partners */}
      <PartnersSection h={h} />

      {/* Verification: the two large cards from /verify plus its trust strip */}
      <VerifySection h={h} onOpenVerify={setVerifyKind} />

      {/* Contact & join */}
      {h.show.cta && <ContactSection h={h} site={site} />}

      {selectedCourse && (
        <CourseDialog
          course={selectedCourse.course}
          cls={selectedCourse.cls}
          onClose={() => setSelectedCourse(null)}
        />
      )}
      {selectedTeacher && (
        <TeacherDialog teacher={selectedTeacher} onClose={() => setSelectedTeacher(null)} />
      )}
      {selectedActivity && (
        <ActivityDialog a={selectedActivity} onClose={() => setSelectedActivity(null)} />
      )}
      {selectedNews && <NewsDialog article={selectedNews} onClose={() => setSelectedNews(null)} />}
      {verifyKind && <VerifyDialog kind={verifyKind} onClose={() => setVerifyKind(null)} />}
    </>
  );
}
