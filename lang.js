const translations = {
  es: {
    nav_stack: "Stack & Formación",
    nav_projects: "Proyectos",
    nav_contact: "Contacto",
    hero_eyebrow: "Rosario, Argentina · UNR FCEYE",
    hero_sub: "Me apasiona la inteligencia artificial y el machine learning. Disfruto entender los datos, construir modelos y buscar la forma más limpia de explicar lo que muestran.",
    hero_btn_projects: "Ver proyectos",
    hero_btn_contact: "Contacto",
    sec_formation: "Formación",
    edu_title: "Licenciatura en<br>Ciencia de Datos",
    edu_sub: "Universidad Nacional de Rosario · FCEyE",
    edu_year: "2026 &ndash; presente &nbsp;·&nbsp; <span id=\"academic-year\"></span>",
    edu_body: "Carrera orientada al análisis estadístico, modelado predictivo y visualización de información. Me interesa especialmente la intersección entre la estadística y las técnicas modernas de machine learning.",
    sec_stack: "Stack Técnico",
    lang_title: "Lenguajes",
    tools_title: "Herramientas",
    sec_idiomas: "Idiomas & Certificaciones",
    idiomas_title: "Idiomas",
    cert_title: "Certificaciones",
    en_bilingual: "Inglés Bilingüe (C2)",
    it_basic: "Italiano (A2)",
    cert_link: "Ver certificado ↗",
    sec_projects: "Proyectos",
    proj1_type: "Open source · herramienta",
    proj1_desc: "Instalador automatizado para ejecutar el software antirrobo del Plan Juana Manso / Conectar Igualdad en distribuciones Linux modernas. Resuelve incompatibilidades de dependencias que inutilizaban el software en sistemas actuales.",
    proj1_detail: "El proyecto nació de la necesidad concreta: el software oficial no corría en ninguna distro moderna. La solución consistió en reempaquetar las dependencias con versiones compatibles y automatizar la instalación con un script Bash.",
    btn_github: "Ver en GitHub",
    sec_academic: "Proyectos Académicos",
    proj3_type: "Juego interactivo",
    proj3_desc: "Trabajo Práctico de Programación 1 (UNR). Implementación interactiva por consola del clásico juego de dados Farkle desarrollado en R.",
    proj4_type: "Análisis de Datos",
    proj4_desc: "Trabajo Práctico de Laboratorio de Datos 1 (UNR). Análisis estadístico sobre resultados históricos de la Fórmula 1 implementando Tidyverse.",
    footer_net: "En la red",
    footer_portfolio: "Portfolio <span id=\"current-year\"></span>"
  },
  en: {
    nav_stack: "Stack & Education",
    nav_projects: "Projects",
    nav_contact: "Contact",
    hero_eyebrow: "Rosario, Argentina · UNR FCEYE",
    hero_sub: "I am passionate about artificial intelligence and machine learning. I enjoy understanding data, building models, and finding the cleanest way to explain what they show.",
    hero_btn_projects: "View projects",
    hero_btn_contact: "Contact",
    sec_formation: "Education",
    edu_title: "B.S. in<br>Data Science",
    edu_sub: "National University of Rosario · FCEyE",
    edu_year: "2026 &ndash; present &nbsp;·&nbsp; <span id=\"academic-year\"></span>",
    edu_body: "Degree focused on statistical analysis, predictive modeling, and data visualization. I am particularly interested in the intersection of statistics and modern machine learning techniques.",
    sec_stack: "Tech Stack",
    lang_title: "Languages",
    tools_title: "Tools",
    sec_idiomas: "Languages & Certifications",
    idiomas_title: "Languages",
    cert_title: "Certifications",
    en_bilingual: "Bilingual English (C2)",
    it_basic: "Italian (A2)",
    cert_link: "View certificate ↗",
    sec_projects: "Projects",
    proj1_type: "Open source · tool",
    proj1_desc: "Automated installer to run the anti-theft software from Plan Juana Manso / Conectar Igualdad on modern Linux distributions. Solves dependency incompatibilities that rendered the software unusable on modern systems.",
    proj1_detail: "The project was born from a concrete need: the official software didn't run on any modern distro. The solution consisted of repackaging dependencies with compatible versions and automating the installation with a Bash script.",
    btn_github: "View on GitHub",
    sec_academic: "Academic Projects",
    proj3_type: "Interactive game",
    proj3_desc: "Programming 1 Coursework (UNR). Interactive console implementation of the classic dice game Farkle developed in R.",
    proj4_type: "Data Analysis",
    proj4_desc: "Data Lab 1 Coursework (UNR). Statistical analysis of historical Formula 1 results implementing Tidyverse.",
    footer_net: "On the web",
    footer_portfolio: "Portfolio <span id=\"current-year\"></span>"
  }
};

document.addEventListener("DOMContentLoaded", () => {
    const langBtn = document.getElementById("lang-toggle");
    if(!langBtn) return;
    
    // Auto-detect language
    let currentLang = localStorage.getItem("lang");
    if (!currentLang) {
        const browserLang = navigator.language || navigator.userLanguage;
        currentLang = browserLang.toLowerCase().startsWith("es") ? "es" : "en";
    }
    
    function setLanguage(lang) {
        currentLang = lang;
        document.documentElement.lang = lang;
        localStorage.setItem("lang", lang);
        
        // Update button text
        langBtn.textContent = lang === "es" ? "EN / es" : "ES / en";
        
        // Update all translation elements
        document.querySelectorAll("[data-i18n]").forEach(el => {
            const key = el.getAttribute("data-i18n");
            if (translations[lang][key]) {
                if (el.tagName === 'A' && el.querySelector('svg')) {
                    // special case for buttons with icons: preserve SVG if it exists at the end or beginning
                    // since our svgs in buttons are mostly at the end or beginning, let's just do innerHTML for them safely
                    if(key === 'hero_btn_contact' || key === 'btn_github' || key === 'footer_net' || key === 'cert_link') {
                        // let's do a more robust approach:
                        // For btn_github, SVG is inside.
                        const svgHtml = el.querySelector('svg').outerHTML;
                        if(key === 'hero_btn_contact' || key === 'btn_github') {
                            el.innerHTML = translations[lang][key] + "\n                            " + svgHtml;
                        } else {
                            el.innerHTML = svgHtml + "\n                                " + translations[lang][key];
                        }
                    }
                } else if (key === 'edu_year' || key === 'edu_title' || key === 'footer_portfolio') {
                    // Keep html inner tags (like <br> or <span>)
                    el.innerHTML = translations[lang][key];
                } else {
                    el.textContent = translations[lang][key];
                }
            }
        });
        
        // Re-calculate dynamic dates after translation injects spans back
        const currentYearSpan = document.getElementById('current-year');
        if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
        
        const academicYearSpan = document.getElementById('academic-year');
        if (academicYearSpan) {
            const startYear = 2026;
            const currentYear = new Date().getFullYear();
            const yearOfStudy = (currentYear - startYear) + 1;
            academicYearSpan.textContent = (lang === 'es' ? yearOfStudy + '.° año' : 'Year ' + yearOfStudy);
        }
    }
    
    // Initial set
    setLanguage(currentLang);
    
    // Toggle on click
    langBtn.addEventListener("click", () => {
        setLanguage(currentLang === "es" ? "en" : "es");
    });
});
