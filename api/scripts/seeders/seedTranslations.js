import { db } from '../../lib/db/index.js';
import { TRANSLATIONS } from '../../lib/db/schema.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function seedTranslations() {
  console.log('  📝 Seeding translations...');
  
  try {
    // Define the path to translation files
    const translationsPath = join(__dirname, '../../../client/src/i18n/locales');
    
    // Load existing translation files
    const enTranslations = JSON.parse(readFileSync(join(translationsPath, 'en.json'), 'utf-8'));
    const esTranslations = JSON.parse(readFileSync(join(translationsPath, 'es.json'), 'utf-8'));
    const frTranslations = JSON.parse(readFileSync(join(translationsPath, 'fr.json'), 'utf-8'));
    const deTranslations = JSON.parse(readFileSync(join(translationsPath, 'de.json'), 'utf-8'));
    
    // Add statusDescriptions to each language
    enTranslations.tasks.statusDescriptions = {
      TO_DO: 'Tasks that are planned but not yet started',
      IN_PROGRESS: 'Tasks currently being worked on',
      IN_REVIEW: 'Tasks awaiting code review or approval',
      DONE: 'Completed tasks',
      TESTING: 'Tasks in testing phase',
      AWAITING_APPROVAL: 'Tasks waiting for stakeholder approval',
      READY_FOR_DEPLOY: 'Tasks ready to be deployed to production',
      ICEBOX: 'Tasks that are deprioritized or on hold'
    };
    
    // Add new statuses to existing status labels
    enTranslations.tasks.statuses.TESTING = 'Testing';
    enTranslations.tasks.statuses.AWAITING_APPROVAL = 'Awaiting Approval';
    enTranslations.tasks.statuses.READY_FOR_DEPLOY = 'Ready for Deploy';
    enTranslations.tasks.statuses.ICEBOX = 'Icebox';
    
    esTranslations.tasks.statusDescriptions = {
      TO_DO: 'Tareas planificadas pero no iniciadas',
      IN_PROGRESS: 'Tareas en las que se está trabajando actualmente',
      IN_REVIEW: 'Tareas en espera de revisión de código o aprobación',
      DONE: 'Tareas completadas',
      TESTING: 'Tareas en fase de pruebas',
      AWAITING_APPROVAL: 'Tareas en espera de aprobación de interesados',
      READY_FOR_DEPLOY: 'Tareas listas para desplegarse en producción',
      ICEBOX: 'Tareas despriorizadas o en espera'
    };
    
    esTranslations.tasks.statuses.TESTING = 'Pruebas';
    esTranslations.tasks.statuses.AWAITING_APPROVAL = 'En Espera de Aprobación';
    esTranslations.tasks.statuses.READY_FOR_DEPLOY = 'Listo para Desplegar';
    esTranslations.tasks.statuses.ICEBOX = 'Congelador';
    
    frTranslations.tasks.statusDescriptions = {
      TO_DO: 'Tâches planifiées mais pas encore commencées',
      IN_PROGRESS: 'Tâches en cours de traitement',
      IN_REVIEW: 'Tâches en attente de révision de code ou d\'approbation',
      DONE: 'Tâches terminées',
      TESTING: 'Tâches en phase de test',
      AWAITING_APPROVAL: 'Tâches en attente d\'approbation des parties prenantes',
      READY_FOR_DEPLOY: 'Tâches prêtes à être déployées en production',
      ICEBOX: 'Tâches déprioritarisées ou en attente'
    };
    
    frTranslations.tasks.statuses.TESTING = 'Tests';
    frTranslations.tasks.statuses.AWAITING_APPROVAL = 'En Attente d\'Approbation';
    frTranslations.tasks.statuses.READY_FOR_DEPLOY = 'Prêt pour le Déploiement';
    frTranslations.tasks.statuses.ICEBOX = 'Frigo';
    
    deTranslations.tasks.statusDescriptions = {
      TO_DO: 'Geplante, aber noch nicht begonnene Aufgaben',
      IN_PROGRESS: 'Aufgaben, an denen derzeit gearbeitet wird',
      IN_REVIEW: 'Aufgaben, die auf Code-Review oder Genehmigung warten',
      DONE: 'Abgeschlossene Aufgaben',
      TESTING: 'Aufgaben in der Testphase',
      AWAITING_APPROVAL: 'Aufgaben, die auf Stakeholder-Genehmigung warten',
      READY_FOR_DEPLOY: 'Aufgaben, die bereit für die Produktionsbereitstellung sind',
      ICEBOX: 'Zurückgestellte oder pausierte Aufgaben'
    };
    
    deTranslations.tasks.statuses.TESTING = 'Testen';
    deTranslations.tasks.statuses.AWAITING_APPROVAL = 'Wartet auf Genehmigung';
    deTranslations.tasks.statuses.READY_FOR_DEPLOY = 'Bereit für Bereitstellung';
    deTranslations.tasks.statuses.ICEBOX = 'Eiskiste';
    
    // Insert translations into database
    await db.insert(TRANSLATIONS).values([
      {
        language_code: 'en',
        translations: JSON.stringify(enTranslations)
      },
      {
        language_code: 'es',
        translations: JSON.stringify(esTranslations)
      },
      {
        language_code: 'fr',
        translations: JSON.stringify(frTranslations)
      },
      {
        language_code: 'de',
        translations: JSON.stringify(deTranslations)
      }
    ]);
    
    console.log('  ✅ Translations seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding translations:', error.message);
    throw error;
  }
}
