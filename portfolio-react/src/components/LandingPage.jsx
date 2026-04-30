import { useEffect, useRef } from "react";

export default function LandingPage() {
  const ref = useRef(null);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;

    const sectionWidth = section.offsetWidth;
    const sectionHeight = section.offsetHeight;

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", sectionWidth);
    svg.setAttribute("height", sectionHeight);
    svg.setAttribute("xmlns", svgNS);

    const circleRadius = 1;
    const gap = 15;
    for (let x = 0; x < sectionWidth; x += circleRadius + gap) {
      for (let y = 0; y < sectionHeight; y += circleRadius + gap) {
        const c = document.createElementNS(svgNS, "circle");
        c.setAttribute("cx", x);
        c.setAttribute("cy", y);
        c.setAttribute("r", circleRadius);
        c.setAttribute("fill", "none");
        c.setAttribute("stroke", "rgba(255,255,255,1)");
        c.setAttribute("stroke-width", "0.5");
        svg.appendChild(c);
      }
    }

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    section.style.backgroundImage = `url(${svgUrl})`;
    section.style.backgroundSize = "cover";
    section.style.backgroundPosition = "center";
    section.style.backgroundRepeat = "repeat";
    section.style.position = "relative";
    section.style.zIndex = "1";

    return () => URL.revokeObjectURL(svgUrl);
  }, []);

  return (
    <section id="landingPageSection" className="text-center py-5" ref={ref}>
      <div className="container" style={{ position: "relative", zIndex: 2 }}>
        <h1 style={{ backgroundColor: "black", color: "white", borderRadius: 20 }}>
          Harshita Chakravadhanula
        </h1>
        <h3
          style={{
            backgroundColor: "black",
            color: "white",
            lineHeight: 2,
            borderRadius: 20,
          }}
        >
          Data Visualization Specialist
        </h3>
      </div>
    </section>
  );
}
