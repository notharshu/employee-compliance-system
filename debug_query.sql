SELECT d.id, d.employee_id, d.title, p.first_name, p.last_name, p.email FROM documents d LEFT JOIN profiles p ON d.employee_id = p.id LIMIT 5;
