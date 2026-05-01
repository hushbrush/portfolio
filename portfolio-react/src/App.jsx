import { useEffect, useMemo, useState } from "react";
import VennDiagram from "./components/VennDiagram";
import ProjectModal from "./components/ProjectModal";
import LandingPage from "./components/LandingPage.jsx";
import "./style.css";

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");

const parseProjectMonth = (value) => {
  const match = String(value || "").match(/^(\d{4})-(\d{1,2})$/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, 1);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

export default function App() {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeWorkFilter, setActiveWorkFilter] = useState("client");
  const [visibleMobileProjects, setVisibleMobileProjects] = useState(3);

  const bySlug = useMemo(() => {
    const map = new Map();
    for (const p of projects) map.set(slugify(p.projectName), p);
    return map;
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (activeWorkFilter === "recent") {
      return projects.filter((project) => {
        const months =
          (new Date().getFullYear() - parseProjectMonth(project.dateCompleted).getFullYear()) * 12 +
          (new Date().getMonth() - parseProjectMonth(project.dateCompleted).getMonth());
        return months >= 0 && months <= 12;
      });
    }
    if (activeWorkFilter === "client") {
      return projects.filter((project) =>
        String(project.client || "").trim()
      );
    }
    return projects;
  }, [activeWorkFilter, projects]);

  const mobileProjects = useMemo(
    () =>
      [...projects]
        .sort((a, b) => parseProjectMonth(b.dateCompleted) - parseProjectMonth(a.dateCompleted))
        .slice(0, visibleMobileProjects),
    [projects, visibleMobileProjects]
  );

  // fetch data.json
  useEffect(() => {
    fetch("data.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP error: ${r.status}`);
        return r.json();
      })
      .then((data) => setProjects(data))
      .catch((e) => console.error("Error fetching data.json:", e));
  }, []);

  // open modal from hash on load + when projects arrive
  useEffect(() => {
    if (!projects.length) return;
    const slug = window.location.hash.replace(/^#/, "");
    if (!slug) return;
    const p = bySlug.get(slug);
    if (p) setActiveProject(p);
  }, [projects, bySlug]);

  // back/forward handling
  useEffect(() => {
    const onPop = () => {
      const slug = window.location.hash.replace(/^#/, "");
      if (!slug) {
        setActiveProject(null);
        return;
      }
      const p = bySlug.get(slug);
      if (p) setActiveProject(p);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [bySlug]);

  const openProject = (project) => {
    setActiveProject(project);
    const slug = slugify(project.projectName);
    if (window.location.hash !== `#${slug}`) {
      window.history.pushState({ project: slug }, "", `#${slug}`);
    }
  };

  const closeProject = () => {
    setActiveProject(null);
    // clear hash using back if it exists (similar to what you did)
    if (window.location.hash) window.history.back();
  };

  return (
    <>
      <header>
        <div id="headerSection">
          <nav className={isMenuOpen ? "is-open" : ""}>
            <button
              className="menu-toggle"
              type="button"
              aria-label="Toggle navigation"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <ul className="nav">
              <li className="nav-item">
                <a className="nav-link" href="#projectsSection" onClick={() => setIsMenuOpen(false)}>
                  Work
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#aboutSection" onClick={() => setIsMenuOpen(false)}>
                  About
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#contactSection" onClick={() => setIsMenuOpen(false)}>
                  Contact
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <LandingPage />

      <section id="projectsSection" className="text-center py-5">
        <div className="container">
          <h2>Work</h2>
          <h4>Click a project to view details</h4>
          <div className="work-filters" aria-label="Project filters">
            {[
              ["all", "All"],
              ["recent", "Recent"],
              ["client", "Professional"],
            ].map(([filter, label]) => (
              <button
                key={filter}
                type="button"
                className={`work-filter${activeWorkFilter === filter ? " is-active" : ""}`}
                aria-pressed={activeWorkFilter === filter}
                onClick={() => {
                  setActiveWorkFilter(filter);
                  if (filter === "recent") setVisibleMobileProjects(3);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div id="mobileProjectCards" aria-label="Recent projects">
            {mobileProjects.map((project) => {
              const slug = slugify(project.projectName);
              return (
                <button
                  key={project.projectName}
                  type="button"
                  className="mobile-project-card"
                  onClick={() => openProject(project)}
                >
                  <img
                    src={`/assets/thumbnails/${slug}.png`}
                    alt={`${project.projectName} thumbnail`}
                  />
                  <span>{project.projectName}</span>
                </button>
              );
            })}
            {visibleMobileProjects < projects.length ? (
              <button
                type="button"
                className="mobile-see-more"
                onClick={() => setVisibleMobileProjects((count) => count + 3)}
              >
                See more
              </button>
            ) : null}
          </div>
        </div>

        <VennDiagram
          projects={filteredProjects}
          activeFilter={activeWorkFilter}
          onProjectClick={openProject}
        />
      </section>

      <section id="aboutSection">
        <div className="row align-items-center">
          <div className="col-md-1"></div>
          <div className="col-md-3">
            <img src="/assets/profile_2026.png" alt="Profile" className="img-fluid rounded-circle" />
          </div>
          <div className="col-md-1"></div>
          <div className="col-md-7">
            <h4>
              <strong>Hi, I'm Harshita!</strong>
            </h4>
            <h5>
              I'd say I'm a Data Viz Person™, or a Creative Technologist, or a Visual
              Designer, or a Front-end Developer, but really, I'm just someone who loves
              code, data and design. I believe in the power of visualization to make
              information accessible and engaging. <br /> I have some experience as each
              of those titles, but most recently, I'm a Data Visualization Engineer at{" "}
              <a href="https://www.jurisee.com/">JuriSee</a>, and a Design and Data
              Fellow at <a href="https://crafd.io/">CRAF'd (United Nations)</a> in New
              York. I'm also a recent graduate of the MS Data Viz Program at Parsons.
            </h5>
            <h5>
              <strong>Skills & Tools</strong>
            </h5>
            <ul>
              <li>Data (D3.js, MicroStrategy, R, Python)</li>
              <li>Visual/UI Design (Adobe Suite, Figma, Wix, Squarespace)</li>
              <li>Front-End Development (HTML, CSS, JavaScript, TypeScript, React, Vue.js)</li>
              <li>Problem-Solving through Conceptual & Analytical Thinking</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="contactSection">
        <h3>Get in Touch!</h3>
        <h5>
          If you're interested in collaborating or just want to chat about design, data,
          or anything in between, feel free to reach out!
        </h5>
        <div className="d-flex justify-content-center gap-3 mt-4">
          <a href="mailto:harshitachakravadhanula@gmail.com">Email</a>
          <a href="https://www.linkedin.com/in/harshita-chakravadhanula-506813183/">
            LinkedIn
          </a>
          <a href="https://github.com/hushbrush">GitHub</a>
        </div>
        <div id="space"></div>
      </section>

      <footer>
        <div id="footerSection">
          <p>Harshita Chakravadhanula, 2025©</p>
        </div>
      </footer>

      <ProjectModal project={activeProject} onClose={closeProject} />
    </>
  );
}
