import { useMemo } from "react";

import type { Conversation } from "../../services/api";

interface ActivityOverviewProps {
  conversations: Conversation[];
}

interface ActivityPoint {
  label: string;
  value: number;
}

function ActivityOverview({
  conversations,
}: ActivityOverviewProps) {
  const activity = useMemo<ActivityPoint[]>(() => {
    const now = new Date();

    const points: ActivityPoint[] = [];

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date(now);

      date.setHours(0, 0, 0, 0);
      date.setDate(
        now.getDate() - offset,
      );

      const nextDate = new Date(date);
      nextDate.setDate(
        date.getDate() + 1,
      );

      const value = conversations.filter(
        (conversation) => {
          const createdAt = new Date(
            conversation.created_at,
          );

          return (
            createdAt >= date &&
            createdAt < nextDate
          );
        },
      ).length;

      points.push({
        label: new Intl.DateTimeFormat(
          undefined,
          {
            month: "short",
            day: "numeric",
          },
        ).format(date),
        value,
      });
    }

    return points;
  }, [conversations]);

  const maxValue = Math.max(
    ...activity.map((item) => item.value),
    1,
  );

  return (
    <section className="dashboard-panel activity-panel">
      <h2>Activity Overview</h2>

      <div className="chart">
        <div className="chart-area">
          <div className="chart-grid">
            <span />
            <span />
            <span />
            <span />
          </div>

          <div className="chart-bars">
            {activity.map((item) => (
              <div
                className="chart-column"
                key={item.label}
              >
                <div
                  className="chart-bar"
                  style={{
                    height: `${
                      (item.value / maxValue) *
                      100
                    }%`,
                  }}
                  title={`${item.value} conversations`}
                />

                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ActivityOverview;