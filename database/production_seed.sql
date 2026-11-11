-- HackMate production reference data only. No demo accounts.
SET NAMES utf8mb4;

INSERT INTO campuses (id, name, short_name, slug, city) VALUES
 (1,'Indira Gandhi Delhi Technical University for Women','IGDTUW','igdtuw','Delhi'),
 (2,'Delhi Technological University','DTU','dtu','Delhi'),
 (3,'Netaji Subhas University of Technology','NSUT','nsut','Delhi'),
 (4,'Indian Institute of Technology Delhi','IIT Delhi','iit-delhi','Delhi'),
 (5,'Other','Other','other',NULL);


INSERT INTO campuses (id, name, short_name, slug, city)
VALUES (6, 'Indraprastha Institute of Information Technology Delhi',
        'IIIT Delhi', 'iiit-delhi', 'Delhi');

INSERT INTO skills (id, name, category) VALUES
 (1,'Python','language'),(2,'JavaScript','language'),(3,'Java','language'),(4,'C++','language'),
 (5,'React','frontend'),(6,'HTML/CSS','frontend'),(7,'Node.js','backend'),(8,'PHP','backend'),
 (9,'MySQL','backend'),(10,'FastAPI','backend'),(11,'Machine Learning','data_ai'),(12,'Deep Learning','data_ai'),
 (13,'Data Analysis','data_ai'),(14,'Flutter','mobile'),(15,'Android','mobile'),(16,'Figma','design'),
 (17,'UI/UX','design'),(18,'Docker','devops'),(19,'Git','devops'),(20,'Cybersecurity','other'),
 (21,'Blockchain','other'),(22,'IoT','other'),(23,'Research Writing','other'),(24,'Product Management','other'),
 (25,'TensorFlow','data_ai'),(26,'AI/ML','data_ai'),(27,'Data Science','data_ai'),(28,'Cloud','devops'),(29,'DevOps','devops');
