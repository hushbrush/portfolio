import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const safeId = (name) =>
  name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");

const parseProjectMonth = (value) => {
  const match = String(value || "").match(/^(\d{4})-(\d{1,2})$/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, 1);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

function generateCircleAttributes(projects) {
  const maxSize = 80;
  const minSize = 30;

  const newestDate = new Date(
    Math.max(...projects.map((p) => parseProjectMonth(p.dateCompleted)))
  );
  const oldestDate = new Date(
    Math.min(...projects.map((p) => parseProjectMonth(p.dateCompleted)))
  );
  const dateRange = newestDate - oldestDate || 1;

  projects.forEach((p) => {
    const d = parseProjectMonth(p.dateCompleted);
    const size =
      ((d - oldestDate) / dateRange) * (maxSize - minSize) + minSize;
    p.size = size;
  });
}

function getCategoryCounts(projects) {
  const counts = { data: 0, design: 0, allCategories: 0 };
  projects.forEach((p) => {
    const categories = (p.categories || "").toLowerCase();
    const isData = categories.includes("data");
    const isDesign = categories.includes("design");
    if (isData) counts.data++;
    if (isDesign) counts.design++;
    if (isData && isDesign) counts.allCategories++;
  });
  return counts;
}

function determineVennCirclePositions(svgWidth, svgHeight, circleRadius) {
  const overlapX = svgWidth / 2.05;
  const overlapY = svgHeight / 4;
  const overlapBetweenCircles = 100;

  return [
    {
      id: "data",
      cx: overlapX - circleRadius / 2 + overlapBetweenCircles / 2,
      cy: overlapY + circleRadius / 2,
      radius: circleRadius,
    },
    {
      id: "design",
      cx: overlapX + circleRadius / 2 - overlapBetweenCircles / 2,
      cy: overlapY + circleRadius / 2,
      radius: circleRadius,
    },
  ];
}

function assignProjectPositions(projects, vennCircles, svgWidth, svgHeight) {
  const [cData, cDesign] = vennCircles;

  projects.forEach((p) => {
    const categories = (p.categories || "").toLowerCase();
    const isData = categories.includes("data");
    const isDesign = categories.includes("design");

    if (isData && isDesign) {
      p.targetX = (cData.cx + 10 + cDesign.cx) / 2;
      p.targetY = (cData.cy + 20 + cDesign.cy) / 2;
    } else if (isData) {
      p.targetX = cData.cx - 150;
      p.targetY = cData.cy;
    } else if (isDesign) {
      p.targetX = cDesign.cx + 250;
      p.targetY = cDesign.cy;
    } else {
      p.targetX = svgWidth / 2;
      p.targetY = svgHeight / 2;
    }
  });
}

// keep nodes inside a circle “wall”
function forceContainInCircle(cx, cy, r, testFn) {
  let nodes;
  function force(alpha) {
    for (const d of nodes) {
      if (!testFn(d)) continue;
      const dx = d.x - cx,
        dy = d.y - cy;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const overflow = dist + d.size - r;
      if (overflow > 0) {
        d.x -= (dx / dist) * overflow * alpha;
        d.y -= (dy / dist) * overflow * alpha;
      }
    }
  }
  force.initialize = (_) => (nodes = _);
  return force;
}

function showTooltip(event, name, content, categories) {
  const offsetX = 100;
  const tooltipWidth = 480;
  const viewportPadding = 16;
  const categoryText = categories || "";
  const isData = categoryText.includes("Data") || categoryText.includes("data");

  const rawTooltipLeft = isData
    ? event.pageX + offsetX
    : event.pageX - offsetX - tooltipWidth;
  const tooltipLeft = Math.max(
    viewportPadding,
    Math.min(
      rawTooltipLeft,
      window.scrollX + window.innerWidth - tooltipWidth - viewportPadding
    )
  );

  d3.select("#tooltip").remove();

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("id", "tooltip")
    .style("position", "absolute")
    .style("left", `${tooltipLeft}px`)
    .style("top", `${event.pageY + 70}px`)
    .style("width", `${tooltipWidth}px`)
    .style("padding", "15px")
    .style("background", "rgba(0,0,0,0.9)")
    .style("color", "white")
    .style("border-radius", "20px")
    .style("pointer-events", "none")
    .style("font-family", "bricolage-grotesque, sans-serif")
    .style("font-weight", "100")
    .html(`<strong>${name}</strong>: ${content}`);

  tooltip.transition().duration(200).style("opacity", 1);
}

function hideTooltip() {
  d3.select("#tooltip").remove();
}

function showGifWithAnimation(event, project) {
  d3.select("#gifContainer").remove();

  const gifSource = `/assets/${safeId(project.projectName)}/loop.mp4`;

  const circleContainer = d3
    .select("body")
    .append("div")
    .attr("id", "gifContainer")
    .style("width", "0px")
    .style("height", "0px")
    .style("border-radius", "50px")
    .style("position", "absolute")
    .style("overflow", "hidden")
    .style("z-index", "1000")
    .style("background-color", "rgba(0, 0, 0, 0.8)")
    .style("display", "flex")
    .style("align-items", "center")
    .style("justify-content", "center")
    .style("pointer-events", "none");

  circleContainer
    .append("video")
    .attr("src", gifSource)
    .attr("autoplay", true)
    .attr("loop", true)
    .attr("muted", true)
    .attr("playsinline", true)
    .style("width", "auto")
    .style("height", "300px")
    .style("opacity", 1);

  const initialX = event.pageX;
  const initialY = event.pageY;

  circleContainer.style("left", `${initialX}px`).style("top", `${initialY}px`);

  const targetTop = initialY - 250;
  const categoryText = project.categories || "";
  const isData = categoryText.includes("Data") || categoryText.includes("data");

  const rawTargetLeft = isData ? initialX + 100 : initialX - 100 - 480;
  const targetLeft = Math.max(
    window.scrollX + 16,
    Math.min(rawTargetLeft, window.scrollX + window.innerWidth - 480 - 16)
  );

  circleContainer
    .transition()
    .duration(500)
    .style("width", "480px")
    .style("height", "300px")
    .style("left", `${targetLeft}px`)
    .style("top", `${targetTop}px`);
}

export default function VennDiagram({ projects, onProjectClick }) {
  const containerRef = useRef(null);
  const simRef = useRef(null);
  const [viewportKey, setViewportKey] = useState(0);

  useEffect(() => {
    let resizeTimer;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => setViewportKey((key) => key + 1), 180);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!projects || !projects.length) return;

    // clone so D3 can mutate positions without mutating React state
    const data = projects.map((p) => ({ ...p }));

    generateCircleAttributes(data);

    // clear previous render
    if (simRef.current) simRef.current.stop();
    d3.select(containerRef.current).selectAll("*").remove();

    if (window.matchMedia("(max-width: 900px)").matches) return;

    const svgWidth = containerRef.current.clientWidth || window.innerWidth;
    const circleRadius = Math.max(260, Math.min(430, (svgWidth - 140) / 3));
    const svgHeight = Math.max(window.innerHeight * 1.1, circleRadius * 2 + 180);

    const svg = d3
      .select(containerRef.current)
      .append("svg")
      .attr("width", svgWidth)
      .attr("height", svgHeight);

    // defs patterns
    const defs = svg.append("defs");
    data.forEach((p) => {
      const safe = safeId(p.projectName);
      defs
        .append("pattern")
        .attr("id", `thumb-${safe}`)
        .attr("patternUnits", "objectBoundingBox")
        .attr("width", 1)
        .attr("height", 1)
        .append("image")
        .attr("href", `/assets/thumbnails/${safe}.png`)
        .attr("xlink:href", `/assets/thumbnails/${safe}.png`)
        .attr("preserveAspectRatio", "xMidYMid slice")
        .attr("width", p.size * 2)
        .attr("height", p.size * 2);
    });

    // venn circles
    getCategoryCounts(data); // (kept in case you’ll scale radius later)
    const vennCircles = determineVennCirclePositions(svgWidth, svgHeight, circleRadius);
    const [cData, cDesign] = vennCircles;

    svg
      .selectAll(".venn-circle")
      .data(vennCircles)
      .enter()
      .append("circle")
      .attr("class", "venn-circle")
      .attr("id", (d) => d.id)
      .attr("cx", (d) => d.cx)
      .attr("cy", (d) => d.cy)
      .attr("r", (d) => d.radius)
      .attr("fill", "none")
      .attr("stroke", "black");

    svg
      .selectAll(".venn-circle-text")
      .data(vennCircles)
      .enter()
      .append("text")
      .attr("class", "venn-circle-text")
      .attr("x", (d) => d.cx)
      .attr("y", (d) => d.cy - circleRadius - 10)
      .text((d) => d.id.charAt(0).toUpperCase() + d.id.slice(1))
      .attr("text-anchor", "middle")
      .style("font-family", "'bricolage-grotesque', sans-serif")
      .style("font-weight", "300")
      .style("font-size", "16px")
      .attr("fill", "black");

    // legend
    svg
      .append("text")
      .attr("x", svgWidth - 260)
      .attr("y", 40)
      .text("Size = Time Since Completed")
      .style("font-family", "'bricolage-grotesque', sans-serif")
      .style("font-weight", "300")
      .style("font-size", "14px")
      .attr("fill", "black");

    // targets
    assignProjectPositions(data, vennCircles, svgWidth, svgHeight);

    // draw nodes once
    const nodes = svg
      .selectAll(".project-circle")
      .data(data, (d) => d.projectName)
      .enter()
      .append("circle")
      .attr("class", "project-circle")
      .attr("r", (d) => d.size)
      .attr("fill", (d) => `url(#thumb-${safeId(d.projectName)}) #f8f7fc`)
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("mouseenter", (e, d) => {
        showTooltip(e, d.projectName, d.line, d.categories);
        showGifWithAnimation(e, d);
      })
      .on("mouseleave", () => {
        d3.select("#gifContainer").remove();
        hideTooltip();
      })
      .on("click", (_, d) => {
        if (onProjectClick) onProjectClick(d);
      });

    // simulation
    const simulation = d3
      .forceSimulation(data)
      .force("x", d3.forceX((d) => d.targetX).strength(0.6))
      .force("y", d3.forceY((d) => d.targetY).strength(0.3))
      .force("collision", d3.forceCollide((d) => d.size + 10))
      .force(
        "containData",
        forceContainInCircle(cData.cx, cData.cy, circleRadius, (d) =>
          (d.categories || "").toLowerCase().includes("data")
        )
      )
      .force(
        "containDesign",
        forceContainInCircle(cDesign.cx, cDesign.cy, circleRadius, (d) =>
          (d.categories || "").toLowerCase().includes("design")
        )
      )
      .on("tick", () => {
        nodes.attr("cx", (d) => d.x - 20).attr("cy", (d) => d.y - 20);
      });

    simRef.current = simulation;
    simulation.alpha(1).restart();

    // cleanup
    return () => {
      simulation.stop();
      d3.select("#tooltip").remove();
      d3.select("#gifContainer").remove();
    };
  }, [projects, onProjectClick, viewportKey]);

  // (optional) on resize: re-render by triggering effect (simple version)
  // You can add a window resize listener later.

  return <div id="vennDiagram" ref={containerRef} />;
}
