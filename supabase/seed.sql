-- Run AFTER 001_schema.sql. Sample charities (fictional, for demo purposes).
insert into charities (name, slug, category, short_desc, description, is_featured) values
('Clean Rivers Collective', 'clean-rivers', 'Environment',
 'Restoring urban rivers and the communities around them.',
 'We fund river clean-up crews, waste-segregation drives and community water-testing labs across seven cities. Every ₹500 keeps a river crew on the water for a full day.', true),
('Every Child Reads', 'every-child-reads', 'Education',
 'Books, tutors and libraries for first-generation learners.',
 'Every Child Reads builds village libraries and pays for reading tutors so that no child falls behind because of where they were born.', true),
('Second Innings', 'second-innings', 'Sport & Inclusion',
 'Adaptive sports programmes for people with disabilities.',
 'Second Innings provides adaptive equipment, coaching and tournaments so that everyone can enjoy sport, regardless of ability.', false),
('Green Roots Trust', 'green-roots', 'Environment',
 'Planting native forests with local farming families.',
 'Green Roots partners with farmers to plant and protect native tree cover, paying families for every surviving sapling.', false),
('Warm Meals Network', 'warm-meals', 'Hunger Relief',
 'Community kitchens serving hot meals every day.',
 'A volunteer-run network of community kitchens serving more than 4,000 hot meals daily to people who would otherwise go without.', true),
('Mind Matters India', 'mind-matters', 'Mental Health',
 'Free counselling and helplines for young people.',
 'Mind Matters trains peer counsellors and funds free helplines and school wellbeing programmes.', false);

insert into charity_events (charity_id, title, event_date, location)
select id, 'Charity Golf Day', current_date + 45, 'Hyderabad' from charities where slug = 'clean-rivers'
union all
select id, 'Fundraiser Tournament', current_date + 70, 'Bengaluru' from charities where slug = 'second-innings'
union all
select id, 'Tee-off for Tiffins', current_date + 30, 'Pune' from charities where slug = 'warm-meals';

-- Make yourself admin AFTER you have signed up once through the app:
-- update profiles set role = 'admin' where email = 'YOUR-EMAIL@example.com';
