-- =====================================================================
-- Reference data required in every environment (production included).
-- Texts are taken verbatim from the organization's documents.
-- =====================================================================

insert into public.permissions (key, name_bn, description, sort_order) values
  ('applications.view',   'সদস্য আবেদন দেখা',               'আবেদনকারীর ব্যক্তিগত তথ্যসহ আবেদন দেখা', 10),
  ('applications.review', 'আবেদন অনুমোদন / প্রত্যাখ্যান',     'আবেদন যাচাই, অনুমোদন, প্রত্যাখ্যান ও পুনর্বিবেচনা', 20),
  ('applications.delete', 'আবেদন মুছে ফেলা',                 'আবেদন স্থায়ীভাবে মুছে ফেলা', 30),
  ('members.view',        'সদস্য তালিকা দেখা',               'সদস্যদের ব্যক্তিগত যোগাযোগ তথ্যসহ তালিকা দেখা', 40),
  ('members.manage',      'সদস্য ব্যবস্থাপনা',                'পদবী, ছবি, প্রকাশ, নিষ্ক্রিয়/আর্কাইভ ও নতুন সদস্য যোগ', 50),
  ('gallery.manage',      'গ্যালারি ব্যবস্থাপনা',              'ছবি আপলোড, ক্যাপশন, ক্যাটাগরি পরিবর্তন, প্রকাশ, ফোল্ডার সিঙ্ক', 60),
  ('gallery.delete',      'গ্যালারির ছবি মুছে ফেলা',          'গ্যালারি থেকে ছবি স্থায়ীভাবে মুছে ফেলা', 70),
  ('content.manage',      'ওয়েবসাইট কনটেন্ট ব্যবস্থাপনা',      'পরিচিতি, কার্যক্রম, ঘোষণা, যোগাযোগ তথ্য ও সেটিংস', 80),
  ('messages.view',       'যোগাযোগ বার্তা দেখা',              'যোগাযোগ ফর্মের বার্তা দেখা ও পরিচালনা', 90),
  ('users.manage',        'ব্যবহারকারী ও ভূমিকা ব্যবস্থাপনা',   'অ্যাডমিন অ্যাকাউন্ট তৈরি, ভূমিকা ও অনুমতি নির্ধারণ', 100),
  ('audit.view',          'অডিট লগ দেখা',                    'প্রশাসনিক কার্যক্রমের ইতিহাস দেখা', 110);

insert into public.roles (key, name_bn, description, is_system) values
  ('super_admin',      'সুপার অ্যাডমিন',              'সকল অনুমতি; ব্যবহারকারী ও ভূমিকা ব্যবস্থাপনা', true),
  ('admin',            'অ্যাডমিন',                    'ব্যবহারকারী ব্যবস্থাপনা ছাড়া সকল প্রশাসনিক কাজ', true),
  ('secretary',        'সাধারণ সম্পাদক',              'সদস্য আবেদন যাচাই ও অনুমোদন, সদস্য ব্যবস্থাপনা', true),
  ('content_editor',   'কনটেন্ট ও গ্যালারি ব্যবস্থাপক', 'ওয়েবসাইট কনটেন্ট, ঘোষণা ও গ্যালারি', true),
  ('committee_viewer', 'কমিটি সদস্য (দেখার অনুমতি)',    'আবেদন ও সদস্য তালিকা শুধু দেখা', true);

insert into public.role_permissions (role_id, permission)
select r.id, p.permission
from public.roles r
join (values
  ('admin', 'applications.view'), ('admin', 'applications.review'),
  ('admin', 'members.view'), ('admin', 'members.manage'),
  ('admin', 'gallery.manage'), ('admin', 'gallery.delete'),
  ('admin', 'content.manage'), ('admin', 'messages.view'), ('admin', 'audit.view'),
  ('secretary', 'applications.view'), ('secretary', 'applications.review'),
  ('secretary', 'members.view'), ('secretary', 'members.manage'), ('secretary', 'messages.view'),
  ('content_editor', 'gallery.manage'), ('content_editor', 'content.manage'),
  ('committee_viewer', 'applications.view'), ('committee_viewer', 'members.view')
) as p(role_key, permission) on p.role_key = r.key;

-- Positions supplied by the organization (in rank order).
insert into public.designations (name_bn, rank_order) values
  ('সভাপতি', 10),
  ('সহ সভাপতি', 20),
  ('সাধারণ সম্পাদক', 30),
  ('অর্থ সম্পাদক', 40),
  ('সহ অর্থ সম্পাদক', 50),
  ('সাংগঠনিক সম্পাদক', 60),
  ('প্রচার ও প্রকাশনা বিষয়ক সম্পাদক', 70),
  ('যুব কল্যাণ বিষয়ক সম্পাদক', 80),
  ('ধর্ম বিষয়ক সম্পাদক', 90),
  ('সমাজ কল্যাণ সম্পাদক', 100),
  ('শিক্ষা বিষয়ক সম্পাদক', 110),
  ('সদস্য', 1000);

-- Activity categories, in the order of the organization's activity list.
insert into public.activity_categories (slug, name_bn, summary, icon, sort_order) values
  ('volunteering',            'স্বেচ্ছাসেবা ও স্বেচ্ছাশ্রম',          'স্বেচ্ছাশ্রমের জন্য আদর্শবান ও দক্ষ স্বেচ্ছাসেবী তৈরি করা।', 'hand-heart', 10),
  ('disaster-response',       'দুর্যোগে মানবসেবা',                  'সংকট ও দুর্যোগে মানবসেবার হাত বাড়িয়ে দেওয়া।', 'life-buoy', 20),
  ('blood-group',             'রক্তের গ্রুপ নির্ণয়',                 'রক্তের গ্রুপ নির্ণয় কার্যক্রম পরিচালনা করা।', 'droplet', 30),
  ('educational-training',    'শিক্ষামূলক প্রশিক্ষণ',                 'শিক্ষামূলক প্রশিক্ষণের ব্যবস্থা করা।', 'graduation-cap', 40),
  ('educational-materials',   'শিক্ষা সামগ্রী বিতরণ',                'শিক্ষা সামগ্রী বিতরণ কার্যক্রম।', 'book-open', 50),
  ('ramadan-iftar',           'রমজানে ইফতার আয়োজন',                 'রমজান মাসে ইফতারের ব্যবস্থা করা।', 'moon-star', 60),
  ('winter-clothing',         'শীতবস্ত্র বিতরণ',                     'শীতকালে গরিবদের মাঝে শীতবস্ত্র বিতরণ করা।', 'shirt', 70),
  ('medical-assistance',      'অসহায়দের চিকিৎসা সহায়তা',             'অসহায়, নিঃস্ব মানুষের চিকিৎসার ব্যবস্থা করা।', 'stethoscope', 80),
  ('awareness-campaigns',     'জনসচেতনতামূলক কার্যক্রম',            'জনসচেতনতামূলক কার্যক্রম পরিচালনা করা।', 'megaphone', 90),
  ('special-days',            'দিবসভিত্তিক প্রতিযোগিতা ও পুরস্কার',     'বিভিন্ন দিবসে শিক্ষামূলক প্রতিযোগিতার আয়োজন ও পুরস্কার বিতরণ করা।', 'trophy', 100),
  ('islamic-cultural-events', 'মাহফিল, ক্বেরাত ও সাংস্কৃতিক অনুষ্ঠান',  'মাহফিল, ক্বেরাত সম্মেলন ও সাংস্কৃতিক অনুষ্ঠানের আয়োজন করা।', 'book-heart', 110),
  ('eid-distribution',        'ঈদ সামগ্রী বিতরণ',                    'ঈদে ঈদ সামগ্রী বিতরণ করা।', 'gift', 120),
  ('other-activities',        'অন্যান্য সামাজিক কার্যক্রম',           'সংগঠনের অন্যান্য সামাজিক ও কল্যাণমূলক কার্যক্রম।', 'heart-handshake', 130);

-- Editable site content (admin → ওয়েবসাইট কনটেন্ট).
insert into public.site_settings (key, value) values
('organization', jsonb_build_object(
  'name_bn',  'ইনকিলাব যুব সংগঠন',
  'tagline',  'একটি অরাজনৈতিক সামাজিক যুব সংগঠন',
  'slogan',   'আনতে সুপ্রভাত, পথ দেখাবে ইনকিলাব',
  'location', 'কাশীপুর, ফতুল্লা, নারায়ণগঞ্জ'
)),
('about', jsonb_build_object(
  'what_is',   'ইনকিলাব যুব সংগঠন। সম্পূর্ণ অরাজনৈতিক একটি সংগঠন। ইহা একটি সামাজিক যুব সংগঠন।',
  'goal',      'আদর্শবান যুবদের সুসংগঠিত করার মাধ্যমে ইসলামিক, সামাজিক কল্যাণ, সেবা ও শিক্ষামূলক কার্যক্রম পরিচালনা করা। এটি সম্পূর্ণ অরাজনৈতিক একটি সংগঠন।',
  'objective', 'একমাত্র মহান আল্লাহ পাকের সন্তুষ্টি অর্জন করা।',
  'why',       'আমরা জানি, আদর্শবান যুবকরাই একটি জাতির কর্ণধার। তারা জাতিকে নেতৃত্ব দিয়ে থাকে। তারা আল্লাহর রহমতকে সাথে নিয়ে মেধা ও মননের বিকাশ ঘটিয়ে থাকে। যৌবনের উত্তাল ঢেউয়ে তারা যাতে বিপথগামী না হয়ে যায় এবং আদর্শবান যুবকদের সাথে থেকে ব্যক্তি, পারিবারিক, সামাজিক ও রাষ্ট্রীয় জীবন সুন্দর করে পরিচালনা করতে পারে এবং বিভিন্ন ইসলামিক, সামাজিক, সেবা ও শিক্ষামূলক কার্যক্রমের ব্যবস্থা করতে পারে। সে জন্যই আমাদের এই সংগঠন। আমরা একে অন্যের সহযোগী হিসেবে কাজ করতে চাই। আমরা উজ্জীবিত তারুণ্যকে ইসলাম, দেশ ও মানবতার কল্যাণে পরিচালিত করতে চাই।'
)),
('contact', jsonb_build_object(
  'address',      'কাশীপুর, ফতুল্লা, নারায়ণগঞ্জ',
  'phone',        null,
  'email',        null,
  'facebook_url', 'https://www.facebook.com/profile.php?id=61566432706839',
  'map_url',      null,
  'office_hours', null
)),
('membership', jsonb_build_object(
  'is_open', true,
  'declaration', jsonb_build_array(
    'আমি {name} এই মর্মে অঙ্গীকার করছি যে, “ইনকিলাব যুব সংগঠন”-এর সকল নিয়ম কানুন মেনে চলব। সংগঠনের শৃঙ্খলা পরিপন্থি কোন কার্যকলাপে অংশগ্রহণ করবনা। ইসলাম, মানবতা ও রাষ্ট্র বিরোধী কোন কাজে জড়িত হবো না। সংগঠনের সুনাম ক্ষুন্ন হয় এমন কোন কাজ করবনা। ইনশাআল্লাহ',
    'আমি “ইনকিলাব যুব সংগঠন”-এর একজন গর্বিত সদস্য ও আদর্শবান স্বেচ্ছাসেবী হতে চাই। সংগঠনের ইসলামিক, সামাজিক কল্যাণ, সেবা ও শিক্ষামূলক সহ সকল কর্মকাণ্ডে স্বতঃস্ফূর্ত অংশগ্রহণ করতে আগ্রহী। সুতরাং, আমাকে সংগঠনের গর্বিত সদস্য ও আদর্শবান স্বেচ্ছাসেবী করতে বিনীত অনুরোধ রইল।',
    'আমি সংগঠনের সকল নিয়ম-কানুন মেনে চলার অঙ্গীকারবদ্ধ হয়ে সদস্য ফরম জমা করছি।'
  )
)),
('directory', jsonb_build_object(
  'enabled', true
));
