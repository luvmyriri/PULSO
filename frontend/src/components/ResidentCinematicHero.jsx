import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import './resident-cinematic-hero.css';

const SLIDE_DURATION = 8000;
const MotionDiv = motion.div;

const SLIDES = [
    {
        id: 'observe',
        darkImage: '/resident-hero/caloocan-blue-hour-v1.png',
        lightImage: '/resident-hero/caloocan-light-aerial-v1.jpg',
        altKey: 'landing.cinematic.slides.observe.alt',
        alt: 'Wide aerial view across Caloocan, with neighborhoods and transit corridor illuminated under bright daylight.',
        labelKey: 'landing.cinematic.slides.observe.label',
        label: 'Observe',
        eyebrowKey: 'landing.cinematic.slides.observe.eyebrow',
        eyebrow: 'Public works reporting · Caloocan City',
        title: [
            { key: 'landing.cinematic.slides.observe.title1', text: 'See the problem.' },
            { key: 'landing.cinematic.slides.observe.title2', text: 'Start the response.', accent: true },
        ],
        bodyKey: 'landing.cinematic.slides.observe.body',
        body: 'Report road, drainage, lighting, and utility issues across Caloocan—and follow every update.',
    },
    {
        id: 'report',
        darkImage: '/resident-hero/caloocan-rain-response-v1.png',
        lightImage: '/resident-hero/caloocan-light-crew-v1.jpg',
        altKey: 'landing.cinematic.slides.report.alt',
        alt: 'A Caloocan public works maintenance crew and service vehicle on a daylight street inspection.',
        labelKey: 'landing.cinematic.slides.report.label',
        label: 'Report',
        eyebrowKey: 'landing.cinematic.slides.report.eyebrow',
        eyebrow: 'From the street to the right city team',
        title: [
            { key: 'landing.cinematic.slides.report.title1', text: 'When the street speaks, the city' },
            { key: 'landing.cinematic.slides.report.title2', text: 'should listen.', accent: true },
        ],
        bodyKey: 'landing.cinematic.slides.report.body',
        body: 'Show the issue, add the location, and follow the city response from one clear record.',
    },
    {
        id: 'follow',
        darkImage: '/resident-hero/caloocan-dawn-v1.png',
        lightImage: '/resident-hero/caloocan-light-morning-v1.jpg',
        altKey: 'landing.cinematic.slides.follow.alt',
        alt: 'Caloocan morning landscape with neighborhoods leading toward the city horizon.',
        labelKey: 'landing.cinematic.slides.follow.label',
        label: 'Follow',
        eyebrowKey: 'landing.cinematic.slides.follow.eyebrow',
        eyebrow: 'One report · One clear public record',
        title: [
            { key: 'landing.cinematic.slides.follow.title1', text: 'Your report' },
            { key: 'landing.cinematic.slides.follow.title2', text: 'moves', accent: true, inline: true },
            { key: 'landing.cinematic.slides.follow.title3', text: 'the city.', inline: true },
        ],
        bodyKey: 'landing.cinematic.slides.follow.body',
        body: 'Share the evidence. Mark the place. See what happens next.',
    },
];

export default function ResidentCinematicHero({ onExplore }) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const reduceMotion = useReducedMotion();
    const [activeIndex, setActiveIndex] = useState(0);
    const [focusWithin, setFocusWithin] = useState(false);

    const rotationPaused = focusWithin || reduceMotion;
    const activeSlide = SLIDES[activeIndex];

    useEffect(() => {
        if (rotationPaused) return undefined;
        const timer = window.setTimeout(() => {
            setActiveIndex((current) => (current + 1) % SLIDES.length);
        }, SLIDE_DURATION);
        return () => window.clearTimeout(timer);
    }, [activeIndex, rotationPaused]);

    const goToSlide = (index) => {
        setActiveIndex((index + SLIDES.length) % SLIDES.length);
    };

    const handleKeyDown = (event) => {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            goToSlide(activeIndex - 1);
        }
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            goToSlide(activeIndex + 1);
        }
    };

    return (
        <section
            id="home"
            className={`resident-cinematic-hero ${isLight ? 'is-light' : 'is-dark'}`}
            aria-roledescription="carousel"
            aria-label={t('landing.cinematic.ariaLabel', 'PULSO introduction')}
            onFocusCapture={() => setFocusWithin(true)}
            onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false);
            }}
            onKeyDown={handleKeyDown}
        >
            <div className="resident-cinematic-hero__media" aria-hidden="true">
                {SLIDES.map((slide, index) => {
                    const imgSrc = isLight ? slide.lightImage : slide.darkImage;
                    return (
                        <img
                            key={`${slide.id}-${isLight ? 'light' : 'dark'}`}
                            src={imgSrc}
                            alt=""
                            className={`resident-cinematic-hero__image ${index === activeIndex ? 'is-active' : ''}`}
                            loading={index === 0 ? 'eager' : 'lazy'}
                            fetchPriority={index === 0 ? 'high' : 'auto'}
                        />
                    );
                })}
                <div className="resident-cinematic-hero__scrim" />
            </div>

            <div className="resident-cinematic-hero__frame">
                <AnimatePresence mode="wait" initial={false}>
                    <MotionDiv
                        key={activeSlide.id}
                        className="resident-cinematic-hero__content"
                        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                        transition={{ duration: reduceMotion ? 0.12 : 0.58, ease: [0.16, 1, 0.3, 1] }}
                        aria-live={rotationPaused ? 'polite' : 'off'}
                        aria-atomic="true"
                    >
                        <p className="resident-cinematic-hero__context">
                            {t(activeSlide.eyebrowKey, activeSlide.eyebrow)}
                        </p>

                        <h1 className="resident-cinematic-hero__title">
                            {activeSlide.title.map((line) => (
                                <span
                                    key={line.key}
                                    className={`${line.accent ? 'is-accent' : ''} ${line.inline ? 'is-inline' : ''}`}
                                >
                                    {t(line.key, line.text)}{' '}
                                </span>
                            ))}
                        </h1>

                        <p className="resident-cinematic-hero__body">
                            {t(activeSlide.bodyKey, activeSlide.body)}
                        </p>

                        <div className="resident-cinematic-hero__actions">
                            <Link className="resident-cinematic-hero__primary" to="/report">
                                <span>{t('landing.cinematic.report', 'Report an Issue')}</span>
                                <ArrowRight aria-hidden="true" size={19} />
                            </Link>
                            <Link className="resident-cinematic-hero__secondary" to="/track">
                                <span>{t('landing.cinematic.track', 'Track a Report')}</span>
                                <ArrowRight aria-hidden="true" size={18} />
                            </Link>
                        </div>
                    </MotionDiv>
                </AnimatePresence>

                <div className="resident-cinematic-hero__controls" aria-label={t('landing.cinematic.slideControls', 'Hero slides')}>
                    <button
                        type="button"
                        className="resident-cinematic-hero__arrow"
                        onClick={() => goToSlide(activeIndex - 1)}
                        aria-label={t('landing.cinematic.previous', 'Previous slide')}
                    >
                        <ArrowLeft aria-hidden="true" size={16} />
                    </button>

                    <div className="resident-cinematic-hero__steps">
                        {SLIDES.map((slide, index) => (
                            <button
                                key={slide.id}
                                type="button"
                                className={`resident-cinematic-hero__step ${index === activeIndex ? 'is-active' : ''}`}
                                onClick={() => goToSlide(index)}
                                aria-current={index === activeIndex ? 'true' : undefined}
                                aria-label={t('landing.cinematic.showSlide', 'Show {{number}}: {{label}}', {
                                    number: index + 1,
                                    label: t(slide.labelKey, slide.label),
                                })}
                            >
                                <span aria-hidden="true">0{index + 1}</span>
                                <span>{t(slide.labelKey, slide.label)}</span>
                                <span className="resident-cinematic-hero__step-line" aria-hidden="true">
                                    {index === activeIndex && !rotationPaused && <span />}
                                </span>
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="resident-cinematic-hero__arrow"
                        onClick={() => goToSlide(activeIndex + 1)}
                        aria-label={t('landing.cinematic.next', 'Next slide')}
                    >
                        <ArrowRight aria-hidden="true" size={16} />
                    </button>

                </div>

                <button type="button" className="resident-cinematic-hero__explore" onClick={onExplore}>
                    <span>{t('landing.cinematic.explore', 'See how PULSO works')}</span>
                    <ArrowDown aria-hidden="true" size={18} />
                </button>
            </div>

            <p className="sr-only">{t(activeSlide.altKey, activeSlide.alt)}</p>
        </section>
    );
}
