
INSERT INTO skills (name, category) VALUES
-- Programming languages
('TypeScript', 'language'),
('C', 'language'),
('C#', 'language'),
('Go', 'language'),
('Rust', 'language'),
('Kotlin', 'language'),
('Swift', 'language'),
('Ruby', 'language'),
('R', 'language'),
('Dart', 'language'),
('MATLAB', 'language'),
('Bash', 'language'),

-- Frontend development
('Next.js', 'frontend'),
('Vue.js', 'frontend'),
('Angular', 'frontend'),
('Svelte', 'frontend'),
('Tailwind CSS', 'frontend'),
('Bootstrap', 'frontend'),
('Sass', 'frontend'),
('Web Accessibility', 'frontend'),

-- Backend development
('Express.js', 'backend'),
('Django', 'backend'),
('Flask', 'backend'),
('Laravel', 'backend'),
('Spring Boot', 'backend'),
('REST APIs', 'backend'),
('GraphQL', 'backend'),
('Redis', 'backend'),
('PostgreSQL', 'backend'),
('MongoDB', 'backend'),
('Firebase', 'backend'),

-- AI, machine learning and data
('Generative AI', 'data_ai'),
('Large Language Models (LLMs)', 'data_ai'),
('Natural Language Processing', 'data_ai'),
('Computer Vision', 'data_ai'),
('PyTorch', 'data_ai'),
('Scikit-learn', 'data_ai'),
('Pandas', 'data_ai'),
('NumPy', 'data_ai'),
('Power BI', 'data_ai'),
('Tableau', 'data_ai'),
('Data Visualization', 'data_ai'),
('Statistics', 'data_ai'),
('MLOps', 'data_ai'),

-- Mobile development
('React Native', 'mobile'),
('iOS Development', 'mobile'),
('Jetpack Compose', 'mobile'),

-- Design and product
('Prototyping', 'design'),
('Wireframing', 'design'),
('Design Systems', 'design'),
('Graphic Design', 'design'),
('Product Design', 'design'),

-- DevOps, cloud and infrastructure
('AWS', 'devops'),
('Microsoft Azure', 'devops'),
('Google Cloud', 'devops'),
('Kubernetes', 'devops'),
('CI/CD', 'devops'),
('Terraform', 'devops'),
('Linux', 'devops'),
('GitHub Actions', 'devops'),

-- Security and emerging technology
('Ethical Hacking', 'other'),
('Network Security', 'other'),
('Smart Contracts', 'other'),
('Solidity', 'other'),
('Robotics', 'other'),
('Embedded Systems', 'other'),
('AR/VR Development', 'other'),
('Game Development', 'other'),
('Technical Writing', 'other'),
('Public Speaking', 'other'),
('Business Analysis', 'other'),
('Market Research', 'other'),
('Pitch Deck Creation', 'other')

ON DUPLICATE KEY UPDATE
  category = VALUES(category);

