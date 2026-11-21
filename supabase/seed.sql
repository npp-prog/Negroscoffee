-- Seed data. Applied by `supabase db reset` locally; for a hosted project run it once with
-- `psql "$DATABASE_URL" -f supabase/seed.sql`. Safe to re-run.
--
-- Cities and municipalities of Negros Island (19 cities, 38 municipalities).
-- Centers are approximate poblacion coordinates for "zoom to town"; refine as needed.

insert into public.cities (slug, name, province, is_city, center)
values
  ('bacolod', 'Bacolod', 'negros_occidental', true, 'SRID=4326;POINT(122.9509 10.6765)'),
  ('bago', 'Bago', 'negros_occidental', true, 'SRID=4326;POINT(122.835 10.538)'),
  ('cadiz', 'Cadiz', 'negros_occidental', true, 'SRID=4326;POINT(123.288 10.9465)'),
  ('escalante', 'Escalante', 'negros_occidental', true, 'SRID=4326;POINT(123.4994 10.8404)'),
  ('himamaylan', 'Himamaylan', 'negros_occidental', true, 'SRID=4326;POINT(122.87 10.0989)'),
  ('kabankalan', 'Kabankalan', 'negros_occidental', true, 'SRID=4326;POINT(122.8141 9.9906)'),
  ('la-carlota', 'La Carlota', 'negros_occidental', true, 'SRID=4326;POINT(122.9216 10.4244)'),
  ('sagay', 'Sagay', 'negros_occidental', true, 'SRID=4326;POINT(123.4242 10.9447)'),
  ('san-carlos', 'San Carlos', 'negros_occidental', true, 'SRID=4326;POINT(123.4095 10.4929)'),
  ('silay', 'Silay', 'negros_occidental', true, 'SRID=4326;POINT(122.9748 10.7937)'),
  ('sipalay', 'Sipalay', 'negros_occidental', true, 'SRID=4326;POINT(122.4045 9.7515)'),
  ('talisay', 'Talisay', 'negros_occidental', true, 'SRID=4326;POINT(122.9672 10.7363)'),
  ('victorias', 'Victorias', 'negros_occidental', true, 'SRID=4326;POINT(123.071 10.901)'),
  ('binalbagan', 'Binalbagan', 'negros_occidental', false, 'SRID=4326;POINT(122.8606 10.1939)'),
  ('calatrava', 'Calatrava', 'negros_occidental', false, 'SRID=4326;POINT(123.4783 10.5964)'),
  ('candoni', 'Candoni', 'negros_occidental', false, 'SRID=4326;POINT(122.6081 9.8156)'),
  ('cauayan', 'Cauayan', 'negros_occidental', false, 'SRID=4326;POINT(122.6105 9.9715)'),
  ('enrique-b-magalona', 'Enrique B. Magalona', 'negros_occidental', false, 'SRID=4326;POINT(122.993 10.874)'),
  ('hinigaran', 'Hinigaran', 'negros_occidental', false, 'SRID=4326;POINT(122.8506 10.2706)'),
  ('hinoba-an', 'Hinoba-an', 'negros_occidental', false, 'SRID=4326;POINT(122.4697 9.5967)'),
  ('ilog', 'Ilog', 'negros_occidental', false, 'SRID=4326;POINT(122.7656 10.0278)'),
  ('isabela', 'Isabela', 'negros_occidental', false, 'SRID=4326;POINT(122.9878 10.2047)'),
  ('la-castellana', 'La Castellana', 'negros_occidental', false, 'SRID=4326;POINT(123.0228 10.3233)'),
  ('manapla', 'Manapla', 'negros_occidental', false, 'SRID=4326;POINT(123.1236 10.9578)'),
  ('moises-padilla', 'Moises Padilla', 'negros_occidental', false, 'SRID=4326;POINT(123.0819 10.2689)'),
  ('murcia', 'Murcia', 'negros_occidental', false, 'SRID=4326;POINT(123.0417 10.605)'),
  ('pontevedra', 'Pontevedra', 'negros_occidental', false, 'SRID=4326;POINT(122.8814 10.3753)'),
  ('pulupandan', 'Pulupandan', 'negros_occidental', false, 'SRID=4326;POINT(122.8019 10.5203)'),
  ('salvador-benedicto', 'Salvador Benedicto', 'negros_occidental', false, 'SRID=4326;POINT(123.2125 10.5944)'),
  ('san-enrique', 'San Enrique', 'negros_occidental', false, 'SRID=4326;POINT(122.85 10.4167)'),
  ('toboso', 'Toboso', 'negros_occidental', false, 'SRID=4326;POINT(123.5133 10.7139)'),
  ('valladolid', 'Valladolid', 'negros_occidental', false, 'SRID=4326;POINT(122.8264 10.46)'),
  ('dumaguete', 'Dumaguete', 'negros_oriental', true, 'SRID=4326;POINT(123.3054 9.3068)'),
  ('bais', 'Bais', 'negros_oriental', true, 'SRID=4326;POINT(123.1214 9.5907)'),
  ('bayawan', 'Bayawan', 'negros_oriental', true, 'SRID=4326;POINT(122.804 9.3646)'),
  ('canlaon', 'Canlaon', 'negros_oriental', true, 'SRID=4326;POINT(123.1966 10.3864)'),
  ('guihulngan', 'Guihulngan', 'negros_oriental', true, 'SRID=4326;POINT(123.2742 10.1167)'),
  ('tanjay', 'Tanjay', 'negros_oriental', true, 'SRID=4326;POINT(123.158 9.516)'),
  ('amlan', 'Amlan', 'negros_oriental', false, 'SRID=4326;POINT(123.2233 9.46)'),
  ('ayungon', 'Ayungon', 'negros_oriental', false, 'SRID=4326;POINT(123.1461 9.8586)'),
  ('bacong', 'Bacong', 'negros_oriental', false, 'SRID=4326;POINT(123.2942 9.2464)'),
  ('basay', 'Basay', 'negros_oriental', false, 'SRID=4326;POINT(122.6333 9.4167)'),
  ('bindoy', 'Bindoy', 'negros_oriental', false, 'SRID=4326;POINT(123.1328 9.7536)'),
  ('dauin', 'Dauin', 'negros_oriental', false, 'SRID=4326;POINT(123.2683 9.1917)'),
  ('jimalalud', 'Jimalalud', 'negros_oriental', false, 'SRID=4326;POINT(123.2 9.9792)'),
  ('la-libertad', 'La Libertad', 'negros_oriental', false, 'SRID=4326;POINT(123.2236 10.0322)'),
  ('mabinay', 'Mabinay', 'negros_oriental', false, 'SRID=4326;POINT(122.9228 9.7288)'),
  ('manjuyod', 'Manjuyod', 'negros_oriental', false, 'SRID=4326;POINT(123.1544 9.6847)'),
  ('pamplona', 'Pamplona', 'negros_oriental', false, 'SRID=4326;POINT(123.1183 9.465)'),
  ('san-jose', 'San Jose', 'negros_oriental', false, 'SRID=4326;POINT(123.2333 9.4167)'),
  ('santa-catalina', 'Santa Catalina', 'negros_oriental', false, 'SRID=4326;POINT(122.865 9.3331)'),
  ('siaton', 'Siaton', 'negros_oriental', false, 'SRID=4326;POINT(123.0336 9.0631)'),
  ('sibulan', 'Sibulan', 'negros_oriental', false, 'SRID=4326;POINT(123.2847 9.3497)'),
  ('tayasan', 'Tayasan', 'negros_oriental', false, 'SRID=4326;POINT(123.1717 9.9208)'),
  ('valencia', 'Valencia', 'negros_oriental', false, 'SRID=4326;POINT(123.2442 9.2819)'),
  ('vallehermoso', 'Vallehermoso', 'negros_oriental', false, 'SRID=4326;POINT(123.3167 10.3333)'),
  ('zamboanguita', 'Zamboanguita', 'negros_oriental', false, 'SRID=4326;POINT(123.1997 9.1031)')
on conflict (slug) do update
  set name = excluded.name, province = excluded.province, is_city = excluded.is_city, center = excluded.center;

-- ---------------------------------------------------------------------------
-- Demo shops (fictional names) so the map has something to show in development.
-- All slugs start with "demo-". Remove before launch:
--   delete from public.shops where slug like 'demo-%';
-- ---------------------------------------------------------------------------
insert into public.shops
  (slug, name, type, latte_price, description, address, city_id, province, location, hours, status, source)
select v.slug, v.name, v.type::public.shop_type, v.latte, v.descr, v.addr,
       c.id, c.province,
       extensions.st_setsrid(extensions.st_makepoint(v.lng, v.lat), 4326)::extensions.geography,
       v.hours::jsonb, 'published', 'admin'
from (values
  ('demo-tanaw-roastery', 'Tanaw Roastery (demo)', 'specialty', 175,
   'Demo listing. Light-roast single origins and a slow bar for pour-overs.', 'Lacson St', 'bacolod',
   122.9531, 10.6802,
   '{"mon":[{"open":"07:00","close":"21:00"}],"tue":[{"open":"07:00","close":"21:00"}],"wed":[{"open":"07:00","close":"21:00"}],"thu":[{"open":"07:00","close":"21:00"}],"fri":[{"open":"07:00","close":"22:00"}],"sat":[{"open":"08:00","close":"22:00"}],"sun":[{"open":"08:00","close":"20:00"}]}'),
  ('demo-kapihan-sa-plaza', 'Kapihan sa Plaza (demo)', 'kapihan', 75,
   'Demo listing. Barako brewed in a kettle, pandesal and piaya all morning.', 'Plaza area', 'bacolod',
   122.9497, 10.6688,
   '{"mon":[{"open":"05:30","close":"11:00"}],"tue":[{"open":"05:30","close":"11:00"}],"wed":[{"open":"05:30","close":"11:00"}],"thu":[{"open":"05:30","close":"11:00"}],"fri":[{"open":"05:30","close":"11:00"}],"sat":[{"open":"05:30","close":"12:00"}],"sun":[]}'),
  ('demo-daily-grind-mandalagan', 'Daily Grind Mandalagan (demo)', 'chain', 140,
   'Demo listing. Branch of a regional chain, open late with plenty of outlets.', 'Mandalagan', 'bacolod',
   122.9612, 10.6958,
   '{"mon":[{"open":"07:00","close":"24:00"}],"tue":[{"open":"07:00","close":"24:00"}],"wed":[{"open":"07:00","close":"24:00"}],"thu":[{"open":"07:00","close":"24:00"}],"fri":[{"open":"07:00","close":"02:00"}],"sat":[{"open":"07:00","close":"02:00"}],"sun":[{"open":"07:00","close":"24:00"}]}'),
  ('demo-daily-grind-capitol', 'Daily Grind Capitol (demo)', 'chain', 140,
   'Demo listing. Same chain, near the Capitol lagoon.', 'Capitol area', 'bacolod',
   122.9476, 10.6745, null),
  ('demo-asukal-espresso-bar', 'Asukal Espresso Bar (demo)', 'specialty', 210,
   'Demo listing. Espresso tonics and a tasting flight of Negros-grown beans.', '21st St', 'bacolod',
   122.9555, 10.6830,
   '{"tue":[{"open":"10:00","close":"20:00"}],"wed":[{"open":"10:00","close":"20:00"}],"thu":[{"open":"10:00","close":"20:00"}],"fri":[{"open":"10:00","close":"21:00"}],"sat":[{"open":"10:00","close":"21:00"}],"sun":[{"open":"10:00","close":"18:00"}],"mon":[]}'),
  ('demo-balay-kape-silay', 'Balay Kape Silay (demo)', 'specialty', 150,
   'Demo listing. Coffee in a restored ancestral house near the heritage district.', 'Rizal St', 'silay',
   122.9741, 10.7951,
   '{"mon":[{"open":"08:00","close":"18:00"}],"tue":[{"open":"08:00","close":"18:00"}],"wed":[{"open":"08:00","close":"18:00"}],"thu":[{"open":"08:00","close":"18:00"}],"fri":[{"open":"08:00","close":"18:00"}],"sat":[{"open":"08:00","close":"19:00"}],"sun":[{"open":"08:00","close":"19:00"}]}'),
  ('demo-boulevard-beans', 'Boulevard Beans (demo)', 'specialty', 160,
   'Demo listing. Sea-view counter near the boulevard, known for its cold brew.', 'Rizal Blvd', 'dumaguete',
   123.3094, 9.3079,
   '{"mon":[{"open":"07:00","close":"22:00"}],"tue":[{"open":"07:00","close":"22:00"}],"wed":[{"open":"07:00","close":"22:00"}],"thu":[{"open":"07:00","close":"22:00"}],"fri":[{"open":"07:00","close":"23:00"}],"sat":[{"open":"07:00","close":"23:00"}],"sun":[{"open":"07:00","close":"22:00"}]}'),
  ('demo-kapehan-ni-nanay', 'Kapehan ni Nanay (demo)', 'kapihan', 65,
   'Demo listing. Tablea hot chocolate and native coffee by the market.', 'Market area', 'dumaguete',
   123.3040, 9.3102,
   '{"mon":[{"open":"06:00","close":"14:00"}],"tue":[{"open":"06:00","close":"14:00"}],"wed":[{"open":"06:00","close":"14:00"}],"thu":[{"open":"06:00","close":"14:00"}],"fri":[{"open":"06:00","close":"14:00"}],"sat":[{"open":"06:00","close":"14:00"}],"sun":[{"open":"06:00","close":"12:00"}]}'),
  ('demo-campus-cup', 'Campus Cup (demo)', 'chain', 120,
   'Demo listing. Student favorite near the university, open 24 hours.', 'Hibbard Ave', 'dumaguete',
   123.3006, 9.3141,
   '{"mon":[{"open":"00:00","close":"24:00"}],"tue":[{"open":"00:00","close":"24:00"}],"wed":[{"open":"00:00","close":"24:00"}],"thu":[{"open":"00:00","close":"24:00"}],"fri":[{"open":"00:00","close":"24:00"}],"sat":[{"open":"00:00","close":"24:00"}],"sun":[{"open":"00:00","close":"24:00"}]}'),
  ('demo-reef-and-roast', 'Reef & Roast Dauin (demo)', 'specialty', 230,
   'Demo listing. Beachside espresso bar popular with divers.', 'National Highway', 'dauin',
   123.2671, 9.1932,
   '{"mon":[{"open":"06:30","close":"17:00"}],"tue":[{"open":"06:30","close":"17:00"}],"wed":[{"open":"06:30","close":"17:00"}],"thu":[{"open":"06:30","close":"17:00"}],"fri":[{"open":"06:30","close":"17:00"}],"sat":[{"open":"06:30","close":"17:00"}],"sun":[{"open":"06:30","close":"17:00"}]}')
) as v(slug, name, type, latte, descr, addr, city, lng, lat, hours)
join public.cities c on c.slug = v.city
on conflict (slug) do update
  set name = excluded.name, type = excluded.type, latte_price = excluded.latte_price,
      price_tier = public.price_tier_for(excluded.latte_price),
      description = excluded.description, address = excluded.address, city_id = excluded.city_id,
      province = excluded.province, location = excluded.location, hours = excluded.hours,
      status = excluded.status;

-- Demo menus (replaced on every run).
delete from public.menu_items m using public.shops s where m.shop_id = s.id and s.slug like 'demo-%';
insert into public.menu_items (shop_id, name, price, category, sort_order)
select s.id, m.name, m.price, m.category, m.ord
from public.shops s
join (values
  ('demo-tanaw-roastery', 'Hot latte 12 oz', 175, 'Espresso', 1),
  ('demo-tanaw-roastery', 'Cortado', 150, 'Espresso', 2),
  ('demo-tanaw-roastery', 'Pour-over of the day', 220, 'Slow bar', 3),
  ('demo-kapihan-sa-plaza', 'Kapeng barako', 45, 'Coffee', 1),
  ('demo-kapihan-sa-plaza', 'Hot latte 12 oz', 75, 'Coffee', 2),
  ('demo-kapihan-sa-plaza', 'Piaya', 25, 'Merienda', 3),
  ('demo-daily-grind-mandalagan', 'Hot latte 12 oz', 140, 'Espresso', 1),
  ('demo-daily-grind-mandalagan', 'Iced caramel macchiato', 165, 'Espresso', 2),
  ('demo-asukal-espresso-bar', 'Hot latte 12 oz', 210, 'Espresso', 1),
  ('demo-asukal-espresso-bar', 'Espresso tonic', 230, 'Signature', 2),
  ('demo-balay-kape-silay', 'Hot latte 12 oz', 150, 'Coffee', 1),
  ('demo-balay-kape-silay', 'Napoleones', 45, 'Pastries', 2),
  ('demo-boulevard-beans', 'Hot latte 12 oz', 160, 'Espresso', 1),
  ('demo-boulevard-beans', 'Cold brew', 170, 'Cold', 2),
  ('demo-kapehan-ni-nanay', 'Tablea chocolate', 60, 'Drinks', 1),
  ('demo-kapehan-ni-nanay', 'Hot latte 12 oz', 65, 'Drinks', 2),
  ('demo-campus-cup', 'Hot latte 12 oz', 120, 'Coffee', 1),
  ('demo-reef-and-roast', 'Hot latte 12 oz', 230, 'Espresso', 1),
  ('demo-reef-and-roast', 'Flat white', 220, 'Espresso', 2)
) as m(slug, name, price, category, ord) on m.slug = s.slug;
