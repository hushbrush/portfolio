import { useEffect } from "react";

export default function ProjectModal({ project, onClose }) {
  useEffect(() => {
    if (!project) return;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape" && onClose) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [project, onClose]);

  if (!project) return null;

  return (
    <div
      id="videoOverlay"
      className="project-modal-overlay"
      onClick={(e) => {
        if (e.target.id === "videoOverlay" && onClose) onClose(); // click outside closes
      }}
    >
      <div className="project-modal">
        <div
          className="project-modal-close"
          role="button"
          aria-label="Close project"
          onClick={onClose}
        >
          ×
        </div>

        {/* LEFT: media */}
        <div className="project-modal-media">
          {(project.mediaLinks || []).map((link) => {
            const isYoutube = link.includes("youtube.com/embed") || link.includes("youtu.be");
            return isYoutube ? (
              <div key={link} className="project-modal-media-frame">
                <iframe
                  src={link}
                  frameBorder="0"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  title={project.projectName}
                />
              </div>
            ) : (
              <img key={link} src={link} alt={project.projectName || ""} />
            );
          })}
        </div>

        {/* RIGHT: info */}
        <div className="project-modal-info">
          <p className="project-modal-title">
            {project.projectName || "Untitled Project"}
          </p>

          <hr className="project-modal-rule" />

          <p className="project-modal-meta">
            {(project.dateCompleted || "").replace("-", "•")} {"  "}||{"  "}
            {(project.tools || "").replace(/,/g, "•")}
          </p>

          {project.link ? (
            <button
              className="project-modal-launch"
              onClick={() => window.open(project.link, "_blank")}
            >
              Launch Project
            </button>
          ) : null}

          <hr className="project-modal-rule" />

          <p className="project-modal-description project-modal-desktop-copy">
            {project.line || "No description provided."}
          </p>

          {project.insights ? (
            <p className="project-modal-insights project-modal-desktop-copy">
              {project.insights}
            </p>
          ) : null}

          <div className="project-modal-mobile-details">
            <details>
              <summary>Overview</summary>
              <p className="project-modal-description">
                {project.line || "No description provided."}
              </p>
            </details>

            {project.insights ? (
              <details>
                <summary>Process</summary>
                <p className="project-modal-insights">{project.insights}</p>
              </details>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
