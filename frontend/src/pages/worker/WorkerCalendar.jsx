import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

const API = 'http://127.0.0.1:8000';

export default function WorkerCalendar() {
  const { t, i18n } = useTranslation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios.get(`${API}/api/my-stages/`, { headers })
      .then(res => {
        // Трансформируем этапы производства в события для календаря
        const formattedEvents = res.data.map(stage => {
          // Если дедлайна нет (старые записи), используем дату создания
          const targetDate = stage.deadline || stage.production_date;

          return {
            id: stage.id,
            title: `${t(`stages.${stage.stage_type}`)}: ${stage.product_name}`,
            start: targetDate, // <--- Указываем дату дедлайна
            backgroundColor: stage.status === 'completed' ? '#16a34a' :
                             stage.status === 'in_progress' ? '#3b82f6' : '#f59e0b',
            borderColor: 'transparent',
            extendedProps: {
              status: stage.status,
              order: stage.order
            }
          };
        });
        setEvents(formattedEvents);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [t]);

  if (loading) return <p style={{ padding: 40 }}>{t('common.loading')}</p>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>{t('worker.calendar.title')}</h2>
      </div>

      <div style={s.calendarWrapper}>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={i18n.language}
          events={events}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek'
          }}
          buttonText={{
            today: 'Сегодня',
            month: 'Месяц',
            week: 'Неделя'
          }}
          height="auto"
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false
          }}
          eventClick={(info) => {
            alert(`Задача: ${info.event.title}\nСтатус: ${t(`status.${info.event.extendedProps.status}`)}`);
          }}
        />
      </div>
    </div>
  );
}

const s = {
  page: { padding: '32px' },
  header: { marginBottom: '24px' },
  title: { margin: 0, fontSize: 22, fontWeight: 700 },
  calendarWrapper: {
    background: '#fff',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
  }
};