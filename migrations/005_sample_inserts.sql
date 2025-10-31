begin;

-- 🩺 Doctor already exists:
--   id = 1860dc59-0331-4d0f-bcbe-4e96c8673cee

-- 1️⃣ Insert 4 patients
with inserted_patients as (
  insert into public.patients (first_name, last_name, date_of_birth, gender, phone, email, address)
  values
    ('Jane', 'Doe', '1990-04-15', 'female', '+48 600 123 456', 'jane.doe@example.com', 'Warsaw, Poland'),
    ('John', 'Smith', '1985-09-20', 'male', '+48 600 987 654', 'john.smith@example.com', 'Kraków, Poland'),
    ('Maria', 'Nowak', '1978-12-02', 'female', '+48 500 333 111', 'maria.nowak@example.com', 'Gdańsk, Poland'),
    ('Piotr', 'Zielinski', '1995-06-10', 'male', '+48 512 765 432', 'piotr.zielinski@example.com', 'Poznań, Poland')
  returning id, first_name
),

-- 2️⃣ Create one visit per patient
inserted_visits as (
  insert into public.visits (patient_id, doctor_id, visit_date, notes)
  select
    id,
    '1860dc59-0331-4d0f-bcbe-4e96c8673cee',
    now() - (row_number() over ()) * interval '2 days',
    case first_name
      when 'Jane' then 'Routine cardiology consultation for mild chest pain'
      when 'John' then 'Follow-up for elevated blood pressure readings'
      when 'Maria' then 'First visit after knee pain complaint'
      when 'Piotr' then 'Post-COVID respiratory check-up'
    end as notes
  from inserted_patients
  returning id, patient_id
),

-- 3️⃣ Insert symptoms
inserted_symptoms as (
  insert into public.visit_symptoms (visit_id, symptom, duration, notes)
  select id,
         case row_number() over ()
           when 1 then 'Chest pain'
           when 2 then 'Headache'
           when 3 then 'Knee pain'
           when 4 then 'Cough'
         end,
         case row_number() over ()
           when 1 then '2 days'
           when 2 then '1 week'
           when 3 then '3 weeks'
           when 4 then '5 days'
         end,
         case row_number() over ()
           when 1 then 'Intermittent discomfort'
           when 2 then 'Pressure-like pain, mostly evenings'
           when 3 then 'Pain when walking stairs'
           when 4 then 'Dry cough, mild fatigue'
         end
  from inserted_visits
  returning id
),

-- 4️⃣ Insert diagnoses
inserted_diagnoses as (
  insert into public.visit_diagnoses (visit_id, diagnosis, notes)
  select id,
         case row_number() over ()
           when 1 then 'Angina pectoris'
           when 2 then 'Hypertension'
           when 3 then 'Arthritis (early signs)'
           when 4 then 'Post-viral bronchitis'
         end,
         case row_number() over ()
           when 1 then 'Recommend ECG, lipid profile'
           when 2 then 'Lifestyle modifications, check-up in 1 month'
           when 3 then 'Prescribed physiotherapy, knee MRI if persists'
           when 4 then 'Symptomatic treatment, rest and hydration'
         end
  from inserted_visits
  returning id
)

select '✅ Seed complete: 4 patients, 4 visits, symptoms & diagnoses inserted.' as status;

commit;
