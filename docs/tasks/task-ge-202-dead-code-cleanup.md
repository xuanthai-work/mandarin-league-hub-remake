# TASK-GE-202-DEAD-CODE-CLEANUP

- **Dev**: Gemini
- **Ngày**: 2026-11-10
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

User yêu cầu dọn code thừa, chết, trùng lặp. QA quét `src/` bằng `tsc --noUnusedLocals --noUnusedParameters`, quét file không ai import và quét `export` không file nào khác dùng, rồi giao danh sách cho Dev. Yêu cầu: không đổi hành vi, không refactor.

## Thay đổi theo file

- **Xóa 11 file chết**: `portal/MyBenefits.tsx`, `portal/MyDepartment.tsx`, `portal/PassOrnaments.tsx`, `lib/data/activities.ts`, 6 template email Supabase Auth cũ (`email-change`, `invite`, `magic-link`, `reauthentication`, `recovery`, `signup`).
- **Gỡ import/tham số thừa**: `VerificationLookup.tsx` (`Progress`, prop `demo`), `__root.tsx` (`Link`), `admin.members.tsx` (`cn`), `courses.index.tsx` (`BookOpen`, `programFee`, `TYPE_LABEL`, `Program`), `site-content.test.ts`.
- **Xóa hẳn symbol không còn chỗ dùng**: `TAGLINE`, `ComingSoon` (SiteLayout), `dmyFromISO`, `descriptionBody`, `ACCOUNT_STATUS`, `forgetAvatarUrl`, `MEMBER_STATUS_LABEL`, `ALL_DEPARTMENTS`, `PROGRAM_OPTIONS`, `TEACHER_STATUS_LABEL`, `TUTOR_NOTICE`, `levelLabel`, `COURSE_STATUSES`, `getMembers`, `NEWS`/`getNews`/`getArticle`, `PARTNERS`/`getPartners`.
- **Chỉ bỏ `export`** (còn dùng nội bộ): `RECAPTCHA_SITE_KEY`, `TIER_INFO`, `NAV`, `CHOICE_KINDS`, `cleanDescription`, `EXPLICIT_DEPT_TONE`, `PHOTO_BUCKET`, `ADMIN_NAV_GROUPS`, `PERSONAL_SECTIONS`, `AVATAR_BUCKET`, `resolveAvatarUrls`, các hằng origin trong `domain.ts`, `describeError`, `trPhrase`, `MEET_MIN_MINUTES`, `EXECUTIVE_POSITIONS`, `ORDINARY_POSITIONS`, `departmentLabel`, `signPublicImages`, `HOME_SECTIONS`, `VI_ONLY_KEYS`, `sortTeachers`, `DEMO_CODES`, `MEMBERS`.
- Giữ lại có chủ đích: `getCourses`/`getCourse`, `getMember`, `NEWS_CATEGORIES`, `PARTNER_CATEGORIES` (còn route dùng).
- Tổng: 43 file, +32 / −1180 dòng. Không đổi logic, UI, không migration.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm exec tsc --noEmit --noUnusedLocals --noUnusedParameters`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 29 warning cũ (Dev).
- `pnpm run test`: 53 file, 464 test pass (Dev).
- Không build.

## Ghi chú

- Key i18n `soon.text` có thể đã mồ côi sau khi xóa `ComingSoon`; chưa xử lý (ngoài phạm vi).
- `AGENTS.md:51` còn nhắc `landsOnAdmin()` (đã xóa ở TASK-GE-201), cần cập nhật ở task sau.
