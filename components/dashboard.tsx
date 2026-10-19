"use client";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  ChevronRight,
  ChevronDown,
  Flag,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  Search,
  Target,
  Users,
  Workflow,
  Check,
  ArrowUpRight,
} from "lucide-react";
import {
  achievement,
  statusLabels,
  type Workspace,
  type Goal,
} from "@/lib/model";
import Brand from "./brand";
import TrendChart from "./trend-chart";
import EditDialog, { type EditRecord } from "./edit-dialog";
const mean = (values: number[]) =>
  values.length
    ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    : 0;
function Progress({ value }: { value: number }) {
  return (
    <span
      className="progress-track"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="達成率"
    >
      <span style={{ width: `${value}%` }} />
    </span>
  );
}
export default function Dashboard({ initial }: { initial: Workspace }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [data, setData] = useState(initial);
  const [departmentId, setDepartmentId] = useState(
    initial.departments[0]?.id ?? "",
  );
  const [goalId, setGoalId] = useState(initial.goals[0]?.id ?? "");
  const [tab, setTab] = useState("dashboard");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<EditRecord | null>(null);
  const [notice, setNotice] = useState("");
  const [mobile, setMobile] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const department = data.departments.find((d) => d.id === departmentId);
  const goals = data.goals.filter((g) => g.department_id === departmentId);
  const goal = goals.find((g) => g.id === goalId) ?? goals[0];
  const kpis = data.kpis.filter((k) => k.goal_id === goal?.id);
  const initiatives = data.initiatives.filter((i) => i.goal_id === goal?.id);
  const [chartId, setChartId] = useState("");
  const chartKpi = kpis.find((k) => k.id === chartId) ?? kpis[0];
  const score = (g: Goal) =>
    mean(data.kpis.filter((k) => k.goal_id === g.id).map(achievement));
  const overall = mean(data.kpis.map(achievement));
  const finished = data.initiatives.filter((i) => i.status === "done").length;
  const matches = useMemo(
    () =>
      query.trim()
        ? [
            ...data.departments
              .filter((d) => d.name.includes(query))
              .map((d) => ({
                id: d.id,
                label: d.name,
                department: d.id,
                goal: "",
              })),
            ...data.goals
              .filter((g) => g.title.includes(query))
              .map((g) => ({
                id: g.id,
                label: g.title,
                department: g.department_id,
                goal: g.id,
              })),
            ...data.kpis
              .filter((k) => k.name.includes(query))
              .map((k) => ({
                id: k.id,
                label: k.name,
                department: data.goals.find((g) => g.id === k.goal_id)!
                  .department_id,
                goal: k.goal_id,
              })),
            ...data.initiatives
              .filter((i) => i.title.includes(query))
              .map((i) => ({
                id: i.id,
                label: i.title,
                department: data.goals.find((g) => g.id === i.goal_id)!
                  .department_id,
                goal: i.goal_id,
              })),
          ]
        : [],
    [query, data],
  );
  function selectDepartment(id: string) {
    setDepartmentId(id);
    setGoalId(data.goals.find((g) => g.department_id === id)?.id ?? "");
    setChartId("");
    setMobile(false);
  }
  async function reload() {
    const response = await fetch("/api/workspace", { cache: "no-store" });
    if (response.status === 401) {
      window.location.assign("/login");
      return;
    }
    if (!response.ok) throw new Error("再読み込みに失敗しました。");
    setData((await response.json()) as Workspace);
    setNotice("変更を保存しました。");
  }
  async function logout() {
    try {
      const r = await fetch("/api/auth/logout", { method: "POST" });
      if (!r.ok) throw new Error();
      window.location.assign("/login");
    } catch {
      setLogoutError("ログアウトできませんでした。再度お試しください。");
    }
  }
  const nav = [
    { id: "dashboard", label: "ダッシュボード", icon: LayoutDashboard },
    { id: "organization", label: "組織・部門目標", icon: Building2 },
    { id: "kpis", label: "KPI", icon: BarChart3 },
    { id: "initiatives", label: "実行施策", icon: Workflow },
  ];
  return (
    <div className="app-shell" inert={!ready}>
      <aside className={`sidebar ${mobile ? "sidebar-open" : ""}`}>
        <Brand />
        <div className="workspace-label">MANAGEMENT WORKSPACE</div>
        <nav aria-label="メインナビゲーション">
          {nav.map((n) => (
            <button
              key={n.id}
              className={tab === n.id ? "nav-active" : ""}
              aria-current={tab === n.id ? "page" : undefined}
              onClick={() => {
                setTab(n.id);
                setMobile(false);
              }}
            >
              <n.icon size={19} />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="teal-dot" />
            仮説を、実行につなぐ。<p>2026年度 · MVP</p>
          </div>
          <button onClick={logout}>
            <LogOut size={18} />
            ログアウト
          </button>
          {logoutError && <p role="alert">{logoutError}</p>}
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="メニューを切り替え"
            onClick={() => setMobile(!mobile)}
          >
            <Menu size={22} />
          </button>
          <div className="search-wrap">
            <Search size={17} />
            <input
              aria-label="組織・目標・KPI・施策を検索"
              placeholder="組織・目標・KPI・施策を検索…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <div className="search-results">
                {matches.length ? (
                  matches.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        selectDepartment(m.department);
                        if (m.goal) setGoalId(m.goal);
                        setTab("dashboard");
                        setQuery("");
                      }}
                    >
                      {m.label}
                      <ChevronRight size={15} />
                    </button>
                  ))
                ) : (
                  <p>該当する項目はありません。</p>
                )}
              </div>
            )}
          </div>
          <div className="user-profile">
            <span className="avatar">
              <Users size={18} />
            </span>
            <span>
              <strong>{data.user.name}</strong>
              <small>組織管理者</small>
            </span>
          </div>
        </header>
        <main className="dashboard-main">
          <div className="page-heading">
            <div>
              <p className="breadcrumb">
                Polimill <ChevronRight size={12} /> 経営管理
              </p>
              <h1>
                {nav.find((n) => n.id === tab)?.label === "ダッシュボード"
                  ? "経営ダッシュボード"
                  : nav.find((n) => n.id === tab)?.label}
              </h1>
              <p className="muted">
                目標と実行をつなぎ、社会のこれからをつくる。
              </p>
            </div>
            <div className="period">
              2026年度<span>4月 — 3月</span>
            </div>
          </div>
          <div className="hypothesis-banner">
            <span className="teal-dot" />
            <strong>仮説データ</strong>
            <span>
              表示中の組織・数値・担当者はすべて架空です。各項目から編集できます。
            </span>
          </div>
          {notice && (
            <div role="status" className="save-notice">
              <Check size={16} />
              {notice}
              <button className="text-button" onClick={() => setNotice("")}>
                閉じる
              </button>
            </div>
          )}
          <section className="metrics" aria-label="全社サマリー">
            <article>
              <span className="metric-icon">
                <Target size={22} />
              </span>
              <div>
                <p>全社KPI達成率</p>
                <strong>
                  {overall}
                  <small>%</small>
                </strong>
                <Progress value={overall} />
              </div>
            </article>
            <article>
              <span className="metric-icon orange">
                <Flag size={22} />
              </span>
              <div>
                <p>部門目標</p>
                <strong>
                  {data.goals.length}
                  <small>目標 / {data.departments.length}部門</small>
                </strong>
                <span className="metric-caption">組織の目標をひとつに</span>
              </div>
            </article>
            <article>
              <span className="metric-icon">
                <BarChart3 size={22} />
              </span>
              <div>
                <p>KPIモニタリング</p>
                <strong>
                  {data.kpis.length}
                  <small>指標</small>
                </strong>
                <span className="metric-caption">目標値・現在値を比較</span>
              </div>
            </article>
            <article>
              <span className="metric-icon blue">
                <Check size={22} />
              </span>
              <div>
                <p>実行施策の進捗</p>
                <strong>
                  {mean(data.initiatives.map((i) => i.progress))}
                  <small>%</small>
                </strong>
                <span className="metric-caption">
                  {finished} / {data.initiatives.length} 施策が完了
                </span>
              </div>
            </article>
          </section>
          <div className={`workspace-grid workspace-${tab}`}>
            <section className="panel organization-panel">
              <div className="panel-heading">
                <h2>
                  <Building2 size={17} />
                  組織ツリー
                </h2>
                <span className="muted small">
                  {data.departments.length}部門
                </span>
              </div>
              <button
                className="org-root"
                onClick={() => {
                  setTab("organization");
                  setNotice("部門を選択すると、目標とKPIを確認できます。");
                }}
              >
                <ChevronDown size={14} />
                <Building2 size={17} />
                <strong>Polimill</strong>
              </button>
              <div className="org-branches">
                {data.departments.map((d) => (
                  <button
                    key={d.id}
                    className={d.id === departmentId ? "department-active" : ""}
                    onClick={() => selectDepartment(d.id)}
                    aria-pressed={d.id === departmentId}
                  >
                    <Building2 size={15} />
                    <span>{d.name}</span>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
              <div className="org-footer">
                <span className="eyebrow">ORGANIZATION MISSION</span>
                <p>
                  ともに考え、ともに創る。
                  <br />
                  社会のこれからを。
                </p>
                <div className="org-count">
                  <Users size={16} /> {data.departments.length}部門で目標を共有
                </div>
              </div>
            </section>
            <div className="detail-column">
              <section className="panel goals-panel">
                <div className="panel-heading">
                  <h2>
                    <Flag size={17} />
                    {department?.name}の目標
                  </h2>
                </div>
                <div className="department-mission">
                  <span className="eyebrow">部門ミッション</span>
                  <p>{department?.mission}</p>
                </div>
                <div className="goal-list">
                  {goals.map((g) => (
                    <button
                      key={g.id}
                      className={g.id === goal?.id ? "goal-active" : ""}
                      aria-pressed={g.id === goal?.id}
                      onClick={() => {
                        setGoalId(g.id);
                        setChartId("");
                      }}
                    >
                      <span className="goal-symbol">
                        <Target size={17} />
                      </span>
                      <span className="goal-row-copy">
                        <strong>{g.title}</strong>
                        <Progress value={score(g)} />
                      </span>
                      <span className="goal-percent">{score(g)}%</span>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                </div>
                {goal && (
                  <div className="hypothesis-detail">
                    <div>
                      <span className="eyebrow">目標に対する仮説</span>
                      <button
                        className="text-button"
                        onClick={() =>
                          setEditing({ kind: "goals", record: goal })
                        }
                      >
                        <Pencil size={13} />
                        目標を編集
                      </button>
                    </div>
                    <p>{goal.hypothesis}</p>
                    <span className="owner-label">
                      <Users size={13} />
                      {goal.owner}
                    </span>
                  </div>
                )}
              </section>
              <section className="panel kpi-panel">
                <div className="panel-heading">
                  <h2>
                    <BarChart3 size={17} />
                    KPIと達成状況
                  </h2>
                  <span className="muted small">{kpis.length}指標</span>
                </div>
                <div className="kpi-rows">
                  {kpis.map((k) => (
                    <div className="kpi-row" key={k.id}>
                      <div>
                        <strong>{k.name}</strong>
                        <span className="muted small">
                          目標 {k.target.toLocaleString()}
                          {k.unit} ·{" "}
                          {k.direction === "up"
                            ? "大きいほど良い"
                            : "小さいほど良い"}
                        </span>
                      </div>
                      <span className="kpi-number">
                        {k.actual.toLocaleString()}
                        <small>{k.unit}</small>
                      </span>
                      <button
                        className="icon-button"
                        aria-label={`${k.name}を編集`}
                        onClick={() => setEditing({ kind: "kpis", record: k })}
                      >
                        <Pencil size={15} />
                      </button>
                      <div className="kpi-progress">
                        <Progress value={achievement(k)} />
                        <span>{achievement(k)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <div className="execution-column">
              {chartKpi && (
                <section className="panel chart-panel">
                  <div className="panel-heading">
                    <h2>
                      <BarChart3 size={17} />
                      KPI推移
                    </h2>
                    <span className="chart-legend">
                      <span className="teal-dot" />
                      実績
                    </span>
                  </div>
                  <div className="chart-heading">
                    <label className="sr-only" htmlFor="chart-kpi">
                      推移を表示するKPI
                    </label>
                    <select
                      id="chart-kpi"
                      value={chartKpi.id}
                      onChange={(e) => setChartId(e.target.value)}
                    >
                      {kpis.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.name}
                        </option>
                      ))}
                    </select>
                    <span>
                      <ArrowUpRight size={16} />
                      {achievement(chartKpi)}%
                    </span>
                  </div>
                  <TrendChart kpi={chartKpi} history={data.history} />
                  <p className="chart-note">
                    2026年4–10月の仮説値。編集は現在値に反映します。
                  </p>
                </section>
              )}
              <section className="panel initiatives-panel">
                <div className="panel-heading">
                  <h2>
                    <Workflow size={17} />
                    実行施策
                  </h2>
                  <span className="muted small">
                    選択中の目標 · {initiatives.length}件
                  </span>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>施策名 / 担当</th>
                        <th>進捗</th>
                        <th>状態 / 期限</th>
                        <th>
                          <span className="sr-only">編集</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {initiatives.map((i) => (
                        <tr key={i.id}>
                          <td>
                            <strong>{i.title}</strong>
                            <small>{i.owner}</small>
                          </td>
                          <td>
                            <span className="table-progress">
                              {i.progress}%
                            </span>
                            <Progress value={i.progress} />
                          </td>
                          <td>
                            <span className={`status status-${i.status}`}>
                              {statusLabels[i.status]}
                            </span>
                            <small>{i.due_date.replaceAll("-", "/")}</small>
                          </td>
                          <td>
                            <button
                              className="icon-button"
                              aria-label={`${i.title}を編集`}
                              onClick={() =>
                                setEditing({ kind: "initiatives", record: i })
                              }
                            >
                              <Pencil size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!initiatives.length && (
                    <p className="empty">この目標には施策がありません。</p>
                  )}
                </div>
                <p className="table-note">
                  施策を編集して、次の一歩を共有しましょう。
                </p>
              </section>
            </div>
          </div>
          <footer className="page-footer">
            Polimill Strategy OS<span>仮説から始める、経営と実行。</span>
          </footer>
        </main>
      </div>
      {editing && (
        <EditDialog
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
}
