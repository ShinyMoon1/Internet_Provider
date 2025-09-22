const navToggle = document.querySelector('.nav__toggle');
const navMenu = document.querySelector('.nav__menu');
const body = document.body;


navToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    
    const isOpening = !navMenu.classList.contains('active');
    
    if (isOpening) {
        navMenu.classList.remove('closing');
        navMenu.classList.add('active');
        navToggle.classList.add('active');
        body.classList.add('menu-open');
        
        document.documentElement.style.overflow = 'hidden';
    } else {
        closeMenu();
    }
});

document.querySelectorAll('.nav__menu a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        
        const targetId = link.getAttribute('href');
        if (targetId.startsWith('#')) {
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                closeMenu();
                setTimeout(() => {
                    targetSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }, 300);
            }
        }
    });
});

document.addEventListener('click', (e) => {
    if (navMenu.classList.contains('active') && 
        !e.target.closest('.nav__menu') && 
        !e.target.closest('.nav__toggle')) {
        closeMenu();
    }
});

function closeMenu() {
    navMenu.classList.add('closing');
    navToggle.classList.remove('active');
    body.classList.remove('menu-open');
    
    document.documentElement.style.overflow = '';
    
    setTimeout(() => {
        navMenu.classList.remove('active', 'closing');
    }, 300);
}

navMenu.addEventListener('click', (e) => {
    e.stopPropagation();
});

window.addEventListener('resize', () => {
    if (window.innerWidth > 968 && navMenu.classList.contains('active')) {
        closeMenu();
    }
});

function updateActiveMenuLink() {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav__menu a');
    
    let currentSection = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        
        if (window.scrollY >= sectionTop - 100 && 
            window.scrollY < sectionTop + sectionHeight - 100) {
            currentSection = '#' + section.id;
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentSection) {
            link.classList.add('active');
        }
    });
}

window.addEventListener('scroll', updateActiveMenuLink);

const style = document.createElement('style');
style.textContent = `
    .nav__menu a.active {
        color: var(--primary) !important;
        font-weight: 700 !important;
    }
    
    @media (max-width: 968px) {
        .nav__menu a.active {
            background: var(--primary) !important;
            color: white !important;
        }
    }
`;
document.head.appendChild(style);