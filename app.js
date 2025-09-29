class RouteplannerApp {
    constructor() {
        this.currentDate = "2024-09-30";
        this.selectedEvent = null;
        this.preferredOnly = true;
        this.merchEventsOnly = false;

        this.init();
    }

    init() {
        this.bindEventListeners();
        this.renderEvents();
        this.setupMap();
    }

    bindEventListeners() {
        // Date selector buttons
        document.querySelectorAll('.date-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentDate = e.target.dataset.date;
                this.renderEvents();
                this.updateMap();
            });
        });

        // Filter checkboxes
        document.getElementById('preferred-only').addEventListener('change', (e) => {
            this.preferredOnly = e.target.checked;
            this.renderEvents();
        });

        document.getElementById('merch-events').addEventListener('change', (e) => {
            this.merchEventsOnly = e.target.checked;
            this.renderEvents();
        });

        // Help icon
        document.querySelector('.help-icon')?.addEventListener('click', () => {
            const instructions = document.getElementById('map-instructions');
            instructions.style.display = instructions.style.display === 'none' ? 'block' : 'none';
        });

        // Station hover events
        document.querySelectorAll('.station-circle').forEach(station => {
            station.addEventListener('mouseenter', (e) => {
                this.highlightStation(e.target.id);
            });

            station.addEventListener('mouseleave', (e) => {
                this.unhighlightStation(e.target.id);
            });
        });
    }

    renderEvents() {
        const container = document.getElementById('events-container');
        const events = eventsData[this.currentDate] || [];

        let filteredEvents = events.filter(event => {
            if (this.preferredOnly && !event.preferred) return false;
            if (this.merchEventsOnly && !event.hasMerch) return false;
            return true;
        });

        // Sort events by time
        filteredEvents.sort((a, b) => {
            const timeA = this.parseTime(a.time.split('-')[0]);
            const timeB = this.parseTime(b.time.split('-')[0]);
            return timeA - timeB;
        });

        container.innerHTML = '';

        if (filteredEvents.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No events match your current filters</p>';
            return;
        }

        filteredEvents.forEach(event => {
            const eventCard = this.createEventCard(event);
            container.appendChild(eventCard);
        });
    }

    createEventCard(event) {
        const card = document.createElement('div');
        card.className = `event-card ${event.preferred ? 'preferred' : ''} ${event.hasMerch ? 'merch' : ''}`;
        card.dataset.eventId = event.id;

        const tags = [];
        if (event.preferred) tags.push('<span class="tag preferred">PREFERRED</span>');
        if (event.hasMerch) tags.push('<span class="tag merch">MERCH</span>');
        if (event.hasFood) tags.push('<span class="tag food">FOOD</span>');

        card.innerHTML = `
            <div class="event-title">${event.title}</div>
            <div class="event-time">🕐 ${event.time}</div>
            <div class="event-location">📍 ${event.location}</div>
            <div class="event-travel">🚇 ${event.travelTime}</div>
            <div class="event-station">🚉 Nearest: ${event.stationName || this.getStationName(event.nearestStation)}</div>
            ${event.description ? `<div style="font-size: 12px; color: #888; margin-top: 5px;">${event.description}</div>` : ''}
            <div class="event-tags">
                ${tags.join('')}
            </div>
        `;

        card.addEventListener('click', () => {
            this.selectEvent(event);
        });

        return card;
    }

    selectEvent(event) {
        // Remove previous selection
        document.querySelectorAll('.event-card').forEach(card => {
            card.classList.remove('selected');
        });

        // Add selection to current card
        document.querySelector(`[data-event-id="${event.id}"]`).classList.add('selected');

        this.selectedEvent = event;
        this.showRouteInfo(event);
        this.highlightEventOnMap(event);
    }

    showRouteInfo(event) {
        const routeDetails = document.getElementById('route-details');

        const travelInfo = this.calculateRoute(event);

        routeDetails.innerHTML = `
            <div class="route-path">
                <div class="route-time">${event.travelTime}</div>
                <div class="route-distance">📍 ${event.location}</div>
                <div style="margin-top: 10px; font-size: 14px;">
                    <strong>🏨 Hotel → 🚇 ${event.stationName || this.getStationName(event.nearestStation)} → 📍 Event</strong>
                </div>
                ${event.description ? `<div style="margin-top: 8px; font-size: 12px; color: #666;">ℹ️ ${event.description}</div>` : ''}
                <div style="margin-top: 10px; font-size: 13px; color: #4CAF50;">
                    💡 Best route via MRT to ${event.stationName || this.getStationName(event.nearestStation)} station
                </div>
            </div>
        `;
    }

    calculateRoute(event) {
        // This is a simplified route calculation
        // In a real app, you'd integrate with Singapore's transport API
        const station = event.nearestStation;
        return {
            totalTime: event.travelTime,
            station: station,
            walking: "5-10 min walk from station"
        };
    }

    getStationName(stationId) {
        const stationNames = {
            "marina-bay": "Marina Bay",
            "raffles-place": "Raffles Place",
            "clarke-quay": "Clarke Quay",
            "chinatown": "Chinatown",
            "bugis": "Bugis",
            "orchard": "Orchard",
            "sentosa": "Sentosa",
            "bayfront": "Bayfront",
            "city-hall": "City Hall"
        };
        return stationNames[stationId] || stationId;
    }

    setupMap() {
        this.addHotelMarker();
        this.updateMap();
    }

    addHotelMarker() {
        const map = document.getElementById('mrt-map');
        const hotelMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        hotelMarker.setAttribute('cx', hotelLocation.x);
        hotelMarker.setAttribute('cy', hotelLocation.y);
        hotelMarker.setAttribute('r', '12');
        hotelMarker.setAttribute('fill', '#FF5722');
        hotelMarker.setAttribute('stroke', 'white');
        hotelMarker.setAttribute('stroke-width', '3');
        hotelMarker.setAttribute('id', 'hotel-marker');

        const hotelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        hotelText.setAttribute('x', hotelLocation.x);
        hotelText.setAttribute('y', hotelLocation.y - 20);
        hotelText.setAttribute('class', 'station-text');
        hotelText.setAttribute('fill', 'white');
        hotelText.setAttribute('font-weight', 'bold');
        hotelText.textContent = '🏨 Hotel';

        map.appendChild(hotelMarker);
        map.appendChild(hotelText);
    }

    updateMap() {
        this.clearEventMarkers();
        this.addEventMarkers();
    }

    clearEventMarkers() {
        document.querySelectorAll('.event-marker').forEach(marker => marker.remove());
        document.querySelectorAll('.event-marker-text').forEach(text => text.remove());
    }

    addEventMarkers() {
        const events = eventsData[this.currentDate] || [];
        const map = document.getElementById('mrt-map');

        // Group events by station to avoid overlapping markers
        const eventsByStation = {};
        events.forEach(event => {
            if (this.preferredOnly && !event.preferred) return;
            if (this.merchEventsOnly && !event.hasMerch) return;

            if (!eventsByStation[event.nearestStation]) {
                eventsByStation[event.nearestStation] = [];
            }
            eventsByStation[event.nearestStation].push(event);
        });

        Object.keys(eventsByStation).forEach(stationId => {
            const eventsAtStation = eventsByStation[stationId];
            const station = stationCoordinates[stationId];
            if (!station) return;

            // Create event marker
            const eventMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            eventMarker.setAttribute('cx', station.x + 15);
            eventMarker.setAttribute('cy', station.y - 15);
            eventMarker.setAttribute('r', '6');
            eventMarker.setAttribute('class', 'event-marker');

            // Add event count
            const eventCount = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            eventCount.setAttribute('x', station.x + 15);
            eventCount.setAttribute('y', station.y - 11);
            eventCount.setAttribute('class', 'event-marker-text');
            eventCount.setAttribute('fill', 'white');
            eventCount.setAttribute('font-size', '10');
            eventCount.setAttribute('font-weight', 'bold');
            eventCount.setAttribute('text-anchor', 'middle');
            eventCount.textContent = eventsAtStation.length;

            map.appendChild(eventMarker);
            map.appendChild(eventCount);

            // Add hover tooltip
            const tooltip = this.createTooltip(eventsAtStation, station.x + 15, station.y - 30);
            eventMarker.addEventListener('mouseenter', () => {
                map.appendChild(tooltip);
            });
            eventMarker.addEventListener('mouseleave', () => {
                if (tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
            });
        });
    }

    createTooltip(events, x, y) {
        const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        tooltip.setAttribute('class', 'tooltip');

        const maxWidth = 200;
        const lineHeight = 15;
        const padding = 8;
        const eventTitles = events.slice(0, 3).map(e => e.title); // Show max 3 events
        if (events.length > 3) eventTitles.push(`+${events.length - 3} more...`);

        const rectHeight = eventTitles.length * lineHeight + padding * 2;

        // Background
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x - maxWidth/2);
        rect.setAttribute('y', y - rectHeight);
        rect.setAttribute('width', maxWidth);
        rect.setAttribute('height', rectHeight);
        rect.setAttribute('fill', 'rgba(0,0,0,0.8)');
        rect.setAttribute('rx', '4');
        tooltip.appendChild(rect);

        // Text lines
        eventTitles.forEach((title, i) => {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', x);
            text.setAttribute('y', y - rectHeight + padding + (i + 1) * lineHeight);
            text.setAttribute('fill', 'white');
            text.setAttribute('font-size', '11');
            text.setAttribute('text-anchor', 'middle');
            text.textContent = title.length > 25 ? title.substring(0, 25) + '...' : title;
            tooltip.appendChild(text);
        });

        return tooltip;
    }

    highlightEventOnMap(event) {
        // Remove previous highlights
        document.querySelectorAll('.station-circle').forEach(station => {
            station.classList.remove('highlighted');
        });

        // Highlight the station for this event
        const station = document.getElementById(event.nearestStation);
        if (station) {
            station.style.fill = '#4CAF50';
            station.style.transform = 'scale(1.2)';
            station.style.transformOrigin = 'center';
        }
    }

    highlightStation(stationId) {
        const station = document.getElementById(stationId);
        if (station && !this.selectedEvent) {
            station.style.fill = '#ffeb3b';
        }
    }

    unhighlightStation(stationId) {
        const station = document.getElementById(stationId);
        if (station && !this.selectedEvent) {
            station.style.fill = 'white';
        }
    }

    parseTime(timeStr) {
        // Convert time string like "13:30" to minutes for sorting
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RouteplannerApp();
});

// Add some additional styling for selected events
const additionalStyles = `
    .event-card.selected {
        border-left-color: #2196F3 !important;
        background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%) !important;
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(33, 150, 243, 0.3) !important;
    }

    .tooltip {
        pointer-events: none;
    }

    .station-circle.highlighted {
        animation: stationPulse 1.5s ease-in-out infinite;
    }

    @keyframes stationPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; transform: scale(1.1); }
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);