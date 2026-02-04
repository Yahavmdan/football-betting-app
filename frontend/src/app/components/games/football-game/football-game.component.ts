import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TranslationService } from '../../../services/translation.service';
import { environment } from '../../../../environments/environment';

interface LeaderboardEntry {
  _id: string;
  user: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  score: number;
  createdAt: string;
}

@Component({
  selector: 'app-football-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './football-game.component.html',
  styleUrls: ['./football-game.component.css']
})
export class FootballGameComponent implements OnInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  // Game state
  gameState: 'idle' | 'playing' | 'gameover' = 'idle';
  score = 0;
  highScore = 0;

  // Ball physics
  ballX = 0;
  ballY = 0;
  ballVelocityX = 0;
  ballVelocityY = 0;
  ballRadius = 30;
  baseGravity = 0.45;
  gravity = 0.45;
  bounceFactor = -0.6;

  // Level system
  level = 1;
  readonly backgrounds = [
    // Grass Fields (1-3)
    { grass: '#1a472a', lines: '#2d5a3d', name: 'Training Ground' },
    { grass: '#1e5a2e', lines: '#38804a', name: 'Premier League' },
    { grass: '#0d3d1a', lines: '#1a5c2a', name: 'Champions League' },
    // Desert (4-5)
    { grass: '#c2956e', lines: '#d4a574', name: 'Desert Storm' },
    { grass: '#8b6914', lines: '#a67c00', name: 'Sahara Heat' },
    // Snow & Ice (6-7)
    { grass: '#a8d5e5', lines: '#c5e8f2', name: 'Frozen Pitch' },
    { grass: '#e8f4f8', lines: '#ffffff', name: 'Arctic Blast' },
    // Lava & Fire (8-10)
    { grass: '#4a1a0a', lines: '#6b2a15', name: 'Volcanic Arena' },
    { grass: '#8b0000', lines: '#b22222', name: 'Inferno' },
    { grass: '#ff4500', lines: '#ff6a33', name: 'Magma Core' },
    // Ocean & Underwater (11-12)
    { grass: '#0a3d62', lines: '#1a5276', name: 'Deep Sea' },
    { grass: '#004d4d', lines: '#006666', name: 'Atlantis' },
    // Night & Space (13-15)
    { grass: '#0c0c1e', lines: '#1a1a3a', name: 'Midnight Match' },
    { grass: '#0a0a20', lines: '#15153a', name: 'Starlight Arena' },
    { grass: '#1a0a2e', lines: '#2d1a4a', name: 'Galaxy Stadium' },
    // Neon & Cyber (16-17)
    { grass: '#0d0d0d', lines: '#00ff88', name: 'Cyber Pitch' },
    { grass: '#1a0a1a', lines: '#ff00ff', name: 'Neon Nights' },
    // Rainbow & Chaos (18-19)
    { grass: '#2a1a3a', lines: '#ff6b6b', name: 'Chaos Field' },
    { grass: '#1a2a1a', lines: '#ffd700', name: 'Golden Glory' },
    // Ultimate (20)
    { grass: '#0a0a0a', lines: '#ffffff', name: 'LEGENDARY' },
  ];

  // Canvas
  private ctx!: CanvasRenderingContext2D;
  private canvasWidth = 0;
  private canvasHeight = 0;
  private animationId: number | null = null;
  private frameCount = 0;
  private lastTime = 0;
  private readonly TARGET_FPS = 60;
  private readonly FRAME_TIME = 1000 / 60; // 16.67ms per frame at 60fps

  // Kick effect
  private kickEffect: { x: number; y: number; frame: number } | null = null;

  // Cached background elements (generated once per level)
  private cachedStars: { x: number; y: number; size: number; brightness: number }[] = [];
  private cachedBubbles: { x: number; y: number; size: number; speed: number }[] = [];
  private cachedSnowflakes: { x: number; y: number; size: number; speed: number }[] = [];
  private cachedLavaRocks: { x: number; y: number; size: number }[] = [];
  private lastCachedLevel = 0;

  // Leaderboard
  leaderboard: LeaderboardEntry[] = [];
  isLoadingLeaderboard = false;
  showLeaderboard = true;

  constructor(
    private http: HttpClient,
    private router: Router,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadLeaderboard();
    this.loadHighScore();
    this.initCanvas();
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  private initCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();
    this.resetBall();
    this.draw();
    // Redraw after a short delay to ensure canvas is properly sized
    setTimeout(() => {
      this.resizeCanvas();
      this.resetBall();
      this.draw();
    }, 100);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement!;
    this.canvasWidth = Math.max(300, container.clientWidth || 300);
    this.canvasHeight = Math.max(300, Math.min(500, window.innerHeight * 0.5));
    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;

    // Adjust ball radius based on screen size (minimum 25px)
    this.ballRadius = Math.max(25, Math.min(35, this.canvasWidth * 0.08));
  }

  private resetBall(): void {
    this.ballX = this.canvasWidth / 2;
    this.ballY = this.canvasHeight / 3;
    this.ballVelocityX = 0;
    this.ballVelocityY = 0;
  }

  startGame(): void {
    this.gameState = 'playing';
    this.score = 0;
    this.level = 1;
    this.gravity = this.baseGravity;
    this.lastTime = performance.now();
    // Ensure canvas is sized
    this.resizeCanvas();
    // Start ball at the bottom and bounce up
    this.ballX = this.canvasWidth / 2;
    this.ballY = this.canvasHeight - this.ballRadius - 5;
    this.ballVelocityX = 0;
    this.ballVelocityY = -12; // Bounce up from ground
    this.gameLoop();
  }

  private gameLoop(): void {
    if (this.gameState !== 'playing') return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Calculate how many "frames" worth of time has passed (normalized to 60fps)
    const deltaMultiplier = deltaTime / this.FRAME_TIME;

    this.frameCount++;
    this.update(deltaMultiplier);
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(delta: number): void {
    // Clamp delta to prevent huge jumps (e.g., when tab is inactive)
    const clampedDelta = Math.min(delta, 3);

    // Apply gravity (scaled by delta time)
    this.ballVelocityY += this.gravity * clampedDelta;

    // Update position (scaled by delta time)
    this.ballX += this.ballVelocityX * clampedDelta;
    this.ballY += this.ballVelocityY * clampedDelta;

    // Wall collision (left/right)
    if (this.ballX - this.ballRadius < 0) {
      this.ballX = this.ballRadius;
      this.ballVelocityX *= -0.8;
    } else if (this.ballX + this.ballRadius > this.canvasWidth) {
      this.ballX = this.canvasWidth - this.ballRadius;
      this.ballVelocityX *= -0.8;
    }

    // Ground collision - game over
    if (this.ballY + this.ballRadius > this.canvasHeight) {
      this.endGame();
    }

    // Allow ball to go above the screen (no ceiling bounce)

    // Add slight air resistance (scaled by delta time)
    this.ballVelocityX *= Math.pow(0.99, clampedDelta);
  }

  private draw(): void {
    if (!this.ctx || this.canvasWidth === 0) return;

    // Regenerate cached elements when level changes
    if (this.level !== this.lastCachedLevel) {
      this.generateCachedElements();
      this.lastCachedLevel = this.level;
    }

    // Get current background based on level
    const bg = this.backgrounds[Math.min(this.level - 1, this.backgrounds.length - 1)];

    // Draw themed background based on level
    this.drawThemedBackground(this.level, bg);

    // Draw kick effect
    if (this.kickEffect && this.kickEffect.frame > 0) {
      const ke = this.kickEffect;
      const alpha = ke.frame / 10;
      const size = (10 - ke.frame) * 4;

      this.ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(ke.x, ke.y, size, 0, Math.PI * 2);
      this.ctx.stroke();

      this.kickEffect.frame--;
    }

    // Always draw ball when playing
    if (this.gameState === 'playing') {
      this.drawBall();
      this.drawUI(bg);
    }
  }

  private generateCachedElements(): void {
    // Generate stars for space levels
    this.cachedStars = [];
    for (let i = 0; i < 100; i++) {
      this.cachedStars.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random()
      });
    }

    // Generate bubbles for ocean levels
    this.cachedBubbles = [];
    for (let i = 0; i < 20; i++) {
      this.cachedBubbles.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        size: Math.random() * 15 + 5,
        speed: Math.random() * 1 + 0.5
      });
    }

    // Generate snowflakes for snow levels
    this.cachedSnowflakes = [];
    for (let i = 0; i < 50; i++) {
      this.cachedSnowflakes.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        size: Math.random() * 4 + 2,
        speed: Math.random() * 2 + 1
      });
    }

    // Generate lava rocks
    this.cachedLavaRocks = [];
    for (let i = 0; i < 15; i++) {
      this.cachedLavaRocks.push({
        x: Math.random() * this.canvasWidth,
        y: this.canvasHeight - Math.random() * 100,
        size: Math.random() * 30 + 20
      });
    }
  }

  private drawThemedBackground(level: number, bg: { grass: string; lines: string; name: string }): void {
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    // Base fill
    ctx.fillStyle = bg.grass;
    ctx.fillRect(0, 0, w, h);

    if (level <= 3) {
      // GRASS FIELDS - Football pitch with lines
      this.drawGrassField(level);
    } else if (level <= 5) {
      // DESERT - Sand dunes, cacti, sun
      this.drawDesert(level);
    } else if (level <= 7) {
      // SNOW & ICE - Snowflakes, mountains
      this.drawSnowscape(level);
    } else if (level <= 10) {
      // LAVA & FIRE - Volcanic, flames, magma
      this.drawLavascape(level);
    } else if (level <= 12) {
      // OCEAN - Underwater with bubbles
      this.drawOcean(level);
    } else if (level <= 15) {
      // SPACE - Stars, planets, nebula
      this.drawSpace(level);
    } else if (level <= 17) {
      // NEON CYBER - Grid, glowing lines
      this.drawCyber(level);
    } else if (level <= 19) {
      // CHAOS - Wild colors, particles
      this.drawChaos(level);
    } else {
      // LEGENDARY - Epic final stage
      this.drawLegendary();
    }
  }

  private drawGrassField(level: number): void {
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    // Gradient grass
    const grassGradient = ctx.createLinearGradient(0, 0, 0, h);
    grassGradient.addColorStop(0, level === 1 ? '#1a472a' : level === 2 ? '#1e5a2e' : '#0d3d1a');
    grassGradient.addColorStop(1, level === 1 ? '#0d2d1a' : level === 2 ? '#0f3d1e' : '#061d0d');
    ctx.fillStyle = grassGradient;
    ctx.fillRect(0, 0, w, h);

    // Grass stripes (mowed pattern)
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < w; i += 40) {
      if (Math.floor(i / 40) % 2 === 0) {
        ctx.fillRect(i, 0, 40, h);
      }
    }

    // Field lines
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;

    // Center circle
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 60, 0, Math.PI * 2);
    ctx.stroke();

    // Center line
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();

    // Penalty areas (simplified)
    ctx.strokeRect(0, h / 2 - 80, 60, 160);
    ctx.strokeRect(w - 60, h / 2 - 80, 60, 160);

    // Grass blades at bottom
    ctx.strokeStyle = level === 1 ? '#2d5a3d' : level === 2 ? '#38804a' : '#1a5c2a';
    ctx.lineWidth = 2;
    for (let i = 0; i < w; i += 8) {
      const grassHeight = 10 + Math.sin(i * 0.1 + this.frameCount * 0.05) * 5;
      ctx.beginPath();
      ctx.moveTo(i, h);
      ctx.lineTo(i + 4, h - grassHeight);
      ctx.stroke();
    }
  }

  private drawDesert(level: number): void {
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    // Sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, h * 0.6);
    skyGradient.addColorStop(0, '#ff7b00');
    skyGradient.addColorStop(1, '#ffb347');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, w, h * 0.6);

    // Sun
    const sunX = w * 0.8;
    const sunY = h * 0.2;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 80);
    sunGlow.addColorStop(0, '#fff8dc');
    sunGlow.addColorStop(0.3, '#ffd700');
    sunGlow.addColorStop(1, 'rgba(255, 200, 0, 0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(sunX - 80, sunY - 80, 160, 160);

    // Sand dunes (background)
    ctx.fillStyle = '#d4a574';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.quadraticCurveTo(w * 0.25, h * 0.35, w * 0.5, h * 0.5);
    ctx.quadraticCurveTo(w * 0.75, h * 0.65, w, h * 0.5);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();

    // Sand dunes (foreground)
    ctx.fillStyle = '#c2956e';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.7);
    ctx.quadraticCurveTo(w * 0.3, h * 0.55, w * 0.6, h * 0.7);
    ctx.quadraticCurveTo(w * 0.85, h * 0.85, w, h * 0.65);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();

    // Cacti
    if (level === 5) {
      this.drawCactus(w * 0.15, h * 0.65, 40);
      this.drawCactus(w * 0.85, h * 0.6, 35);
    }

    // Heat shimmer effect
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < w; i += 20) {
      const shimmer = Math.sin(i * 0.1 + this.frameCount * 0.1) * 3;
      ctx.fillRect(i, h * 0.6 + shimmer, 10, 2);
    }
  }

  private drawCactus(x: number, y: number, size: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#228b22';

    // Main body
    ctx.fillRect(x - size * 0.15, y - size, size * 0.3, size);

    // Arms
    ctx.fillRect(x - size * 0.5, y - size * 0.7, size * 0.35, size * 0.15);
    ctx.fillRect(x - size * 0.5, y - size * 0.7, size * 0.15, size * 0.4);

    ctx.fillRect(x + size * 0.15, y - size * 0.5, size * 0.35, size * 0.15);
    ctx.fillRect(x + size * 0.35, y - size * 0.5, size * 0.15, size * 0.35);
  }

  private drawSnowscape(level: number): void {
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    // Sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, h);
    skyGradient.addColorStop(0, level === 6 ? '#87ceeb' : '#b0c4de');
    skyGradient.addColorStop(1, level === 6 ? '#e0f0ff' : '#f0f8ff');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, w, h);

    // Mountains
    ctx.fillStyle = '#708090';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.7);
    ctx.lineTo(w * 0.2, h * 0.3);
    ctx.lineTo(w * 0.35, h * 0.5);
    ctx.lineTo(w * 0.5, h * 0.25);
    ctx.lineTo(w * 0.7, h * 0.55);
    ctx.lineTo(w * 0.85, h * 0.35);
    ctx.lineTo(w, h * 0.6);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();

    // Snow caps
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(w * 0.15, h * 0.35);
    ctx.lineTo(w * 0.2, h * 0.3);
    ctx.lineTo(w * 0.25, h * 0.38);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w * 0.45, h * 0.3);
    ctx.lineTo(w * 0.5, h * 0.25);
    ctx.lineTo(w * 0.55, h * 0.32);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w * 0.8, h * 0.4);
    ctx.lineTo(w * 0.85, h * 0.35);
    ctx.lineTo(w * 0.9, h * 0.42);
    ctx.fill();

    // Snow ground
    ctx.fillStyle = '#f8f8ff';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.75);
    ctx.quadraticCurveTo(w * 0.25, h * 0.7, w * 0.5, h * 0.75);
    ctx.quadraticCurveTo(w * 0.75, h * 0.8, w, h * 0.72);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();

    // Animated snowflakes
    ctx.fillStyle = '#ffffff';
    for (const flake of this.cachedSnowflakes) {
      const y = (flake.y + this.frameCount * flake.speed) % h;
      const x = flake.x + Math.sin(this.frameCount * 0.02 + flake.x) * 20;
      ctx.beginPath();
      ctx.arc(x, y, flake.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawLavascape(level: number): void {
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    // Dark volcanic sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, h);
    skyGradient.addColorStop(0, '#1a0a0a');
    skyGradient.addColorStop(0.5, '#3d1a1a');
    skyGradient.addColorStop(1, '#4a1a0a');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, w, h);

    // Glowing lava rivers
    const lavaGlow = ctx.createLinearGradient(0, h * 0.7, 0, h);
    lavaGlow.addColorStop(0, '#ff4500');
    lavaGlow.addColorStop(0.5, '#ff6600');
    lavaGlow.addColorStop(1, '#ffcc00');
    ctx.fillStyle = lavaGlow;

    // Animated lava flow
    ctx.beginPath();
    ctx.moveTo(0, h * 0.85);
    for (let i = 0; i <= w; i += 20) {
      const waveY = h * 0.85 + Math.sin(i * 0.02 + this.frameCount * 0.05) * 10;
      ctx.lineTo(i, waveY);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();

    // Lava bubbles
    ctx.fillStyle = '#ffff00';
    for (let i = 0; i < 5; i++) {
      const bubbleX = (w * 0.2 * i + this.frameCount * 2) % w;
      const bubbleY = h * 0.9 + Math.sin(this.frameCount * 0.1 + i) * 5;
      const bubbleSize = 3 + Math.sin(this.frameCount * 0.2 + i) * 2;
      ctx.beginPath();
      ctx.arc(bubbleX, bubbleY, bubbleSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Volcanic rocks
    ctx.fillStyle = '#2d1a0a';
    for (const rock of this.cachedLavaRocks) {
      ctx.beginPath();
      ctx.arc(rock.x, rock.y, rock.size, 0, Math.PI * 2);
      ctx.fill();

      // Rock glow
      ctx.strokeStyle = `rgba(255, 100, 0, ${0.3 + Math.sin(this.frameCount * 0.05) * 0.2})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Ember particles floating up
    ctx.fillStyle = '#ff6600';
    for (let i = 0; i < 20; i++) {
      const emberX = (i * 37 + this.frameCount) % w;
      const emberY = h - ((this.frameCount * 1.5 + i * 50) % h);
      const emberSize = 2 + Math.random();
      ctx.globalAlpha = 1 - emberY / h;
      ctx.beginPath();
      ctx.arc(emberX, emberY, emberSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Level 10: Extra intense
    if (level === 10) {
      ctx.fillStyle = 'rgba(255, 100, 0, 0.1)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  private drawOcean(level: number): void {
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    // Deep ocean gradient
    const oceanGradient = ctx.createLinearGradient(0, 0, 0, h);
    oceanGradient.addColorStop(0, level === 11 ? '#001a33' : '#001a1a');
    oceanGradient.addColorStop(1, level === 11 ? '#004466' : '#004d4d');
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, w, h);

    // Light rays from surface
    ctx.fillStyle = 'rgba(100, 200, 255, 0.03)';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(w * 0.1 + i * w * 0.2, 0);
      ctx.lineTo(w * 0.15 + i * w * 0.2 + 50, h);
      ctx.lineTo(w * 0.05 + i * w * 0.2 - 50, h);
      ctx.fill();
    }

    // Seaweed
    ctx.strokeStyle = '#006633';
    ctx.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
      const baseX = i * (w / 8) + 30;
      ctx.beginPath();
      ctx.moveTo(baseX, h);
      for (let j = 0; j < 5; j++) {
        const y = h - j * 30;
        const x = baseX + Math.sin(j * 0.5 + this.frameCount * 0.03 + i) * 15;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Animated bubbles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (const bubble of this.cachedBubbles) {
      const y = (bubble.y - this.frameCount * bubble.speed + h) % h;
      const x = bubble.x + Math.sin(this.frameCount * 0.02 + bubble.x) * 10;

      ctx.beginPath();
      ctx.arc(x, y, bubble.size, 0, Math.PI * 2);
      ctx.fill();

      // Bubble highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(x - bubble.size * 0.3, y - bubble.size * 0.3, bubble.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    }

    // Fish (level 12)
    if (level === 12) {
      this.drawFish(w * 0.3 + Math.sin(this.frameCount * 0.02) * 50, h * 0.4, 20, '#ff6b6b');
      this.drawFish(w * 0.7 - Math.sin(this.frameCount * 0.015) * 60, h * 0.6, 15, '#ffd93d');
    }
  }

  private drawFish(x: number, y: number, size: number, color: string): void {
    const ctx = this.ctx;
    ctx.fillStyle = color;

    // Body
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x - size * 1.5, y - size * 0.4);
    ctx.lineTo(x - size * 1.5, y + size * 0.4);
    ctx.fill();

    // Eye
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x + size * 0.4, y - size * 0.1, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(x + size * 0.45, y - size * 0.1, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSpace(level: number): void {
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    // Deep space gradient
    const spaceGradient = ctx.createLinearGradient(0, 0, w, h);
    if (level === 13) {
      spaceGradient.addColorStop(0, '#0c0c1e');
      spaceGradient.addColorStop(1, '#1a1a3a');
    } else if (level === 14) {
      spaceGradient.addColorStop(0, '#0a0a20');
      spaceGradient.addColorStop(0.5, '#1a1040');
      spaceGradient.addColorStop(1, '#0a0a20');
    } else {
      spaceGradient.addColorStop(0, '#1a0a2e');
      spaceGradient.addColorStop(0.5, '#2d1a4a');
      spaceGradient.addColorStop(1, '#1a0a2e');
    }
    ctx.fillStyle = spaceGradient;
    ctx.fillRect(0, 0, w, h);

    // Nebula clouds
    if (level >= 14) {
      const nebulaGradient = ctx.createRadialGradient(w * 0.3, h * 0.4, 0, w * 0.3, h * 0.4, 150);
      nebulaGradient.addColorStop(0, 'rgba(100, 50, 150, 0.3)');
      nebulaGradient.addColorStop(1, 'rgba(100, 50, 150, 0)');
      ctx.fillStyle = nebulaGradient;
      ctx.fillRect(0, 0, w, h);

      const nebulaGradient2 = ctx.createRadialGradient(w * 0.7, h * 0.6, 0, w * 0.7, h * 0.6, 120);
      nebulaGradient2.addColorStop(0, 'rgba(50, 100, 150, 0.2)');
      nebulaGradient2.addColorStop(1, 'rgba(50, 100, 150, 0)');
      ctx.fillStyle = nebulaGradient2;
      ctx.fillRect(0, 0, w, h);
    }

    // Stars with twinkling
    for (const star of this.cachedStars) {
      const twinkle = 0.5 + Math.sin(this.frameCount * 0.1 + star.brightness * 10) * 0.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Planet (level 14-15)
    if (level >= 14) {
      const planetX = w * 0.8;
      const planetY = h * 0.25;
      const planetR = 40;

      // Planet body
      const planetGradient = ctx.createRadialGradient(planetX - 10, planetY - 10, 0, planetX, planetY, planetR);
      planetGradient.addColorStop(0, '#8b4513');
      planetGradient.addColorStop(1, '#4a2500');
      ctx.fillStyle = planetGradient;
      ctx.beginPath();
      ctx.arc(planetX, planetY, planetR, 0, Math.PI * 2);
      ctx.fill();

      // Planet ring (level 15)
      if (level === 15) {
        ctx.strokeStyle = 'rgba(200, 180, 150, 0.5)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.ellipse(planetX, planetY, planetR * 1.8, planetR * 0.3, -0.2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Shooting star occasionally
    if (this.frameCount % 200 < 20) {
      const progress = (this.frameCount % 200) / 20;
      const startX = w * 0.1;
      const startY = h * 0.1;
      const endX = w * 0.6;
      const endY = h * 0.4;

      const currentX = startX + (endX - startX) * progress;
      const currentY = startY + (endY - startY) * progress;

      ctx.strokeStyle = `rgba(255, 255, 255, ${1 - progress})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(currentX, currentY);
      ctx.lineTo(currentX - 30 * progress, currentY - 20 * progress);
      ctx.stroke();
    }
  }

  private drawCyber(level: number): void {
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    // Dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    const neonColor = level === 16 ? '#00ff88' : '#ff00ff';
    const neonColorRgb = level === 16 ? '0, 255, 136' : '255, 0, 255';

    // Grid floor with perspective
    ctx.strokeStyle = `rgba(${neonColorRgb}, 0.3)`;
    ctx.lineWidth = 1;

    // Horizontal lines
    for (let i = 0; i < 20; i++) {
      const y = h * 0.5 + i * i * 1.5;
      if (y > h) break;
      ctx.globalAlpha = 1 - (i / 20);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Vertical lines converging
    for (let i = -10; i <= 10; i++) {
      const topX = w / 2 + i * 5;
      const bottomX = w / 2 + i * 80;
      ctx.beginPath();
      ctx.moveTo(topX, h * 0.5);
      ctx.lineTo(bottomX, h);
      ctx.stroke();
    }

    // Glowing horizon line
    ctx.strokeStyle = neonColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = neonColor;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w, h * 0.5);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Animated scan line
    const scanY = (this.frameCount * 2) % h;
    ctx.strokeStyle = `rgba(${neonColorRgb}, 0.5)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, scanY);
    ctx.lineTo(w, scanY);
    ctx.stroke();

    // Floating geometric shapes
    ctx.strokeStyle = neonColor;
    ctx.lineWidth = 2;

    // Triangle
    const triX = w * 0.2 + Math.sin(this.frameCount * 0.02) * 20;
    const triY = h * 0.3 + Math.cos(this.frameCount * 0.02) * 10;
    ctx.beginPath();
    ctx.moveTo(triX, triY - 20);
    ctx.lineTo(triX - 20, triY + 15);
    ctx.lineTo(triX + 20, triY + 15);
    ctx.closePath();
    ctx.stroke();

    // Square
    const sqX = w * 0.8 + Math.cos(this.frameCount * 0.015) * 15;
    const sqY = h * 0.35 + Math.sin(this.frameCount * 0.015) * 15;
    ctx.strokeRect(sqX - 15, sqY - 15, 30, 30);

    // Hexagon in center
    const hexX = w * 0.5;
    const hexY = h * 0.25;
    const hexR = 25 + Math.sin(this.frameCount * 0.05) * 5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = hexX + Math.cos(angle) * hexR;
      const py = hexY + Math.sin(angle) * hexR;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  private drawChaos(level: number): void {
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    // Dark base
    ctx.fillStyle = level === 18 ? '#2a1a3a' : '#1a2a1a';
    ctx.fillRect(0, 0, w, h);

    // Chaotic color bursts
    const colors = level === 18
      ? ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3']
      : ['#ffd700', '#ffaa00', '#ff8c00', '#fff8dc'];

    for (let i = 0; i < 8; i++) {
      const x = (Math.sin(i * 1.5 + this.frameCount * 0.01) * 0.5 + 0.5) * w;
      const y = (Math.cos(i * 1.3 + this.frameCount * 0.01) * 0.5 + 0.5) * h;
      const radius = 50 + Math.sin(this.frameCount * 0.05 + i) * 20;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, colors[i % colors.length] + '40');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }

    // Particle storm
    for (let i = 0; i < 30; i++) {
      const px = (i * 37 + this.frameCount * 3) % w;
      const py = (i * 23 + this.frameCount * 2) % h;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wavy lines
    ctx.strokeStyle = level === 18 ? 'rgba(255, 107, 107, 0.3)' : 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 2;
    for (let wave = 0; wave < 3; wave++) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 5) {
        const y = h * (0.3 + wave * 0.2) + Math.sin(x * 0.02 + this.frameCount * 0.03 + wave) * 30;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  private drawLegendary(): void {
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    // Pure black background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, w, h);

    // Golden particles rising
    for (let i = 0; i < 50; i++) {
      const x = (i * 13) % w;
      const y = h - ((this.frameCount * 1 + i * 20) % (h + 50));
      const size = 2 + (i % 3);
      const alpha = Math.min(1, (h - y) / h);

      ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central glowing emblem
    const centerX = w / 2;
    const centerY = h * 0.4;
    const emblemSize = 60 + Math.sin(this.frameCount * 0.05) * 10;

    // Outer glow
    const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, emblemSize * 2);
    glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
    glowGradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.1)');
    glowGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 0, w, h);

    // Star shape
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const radius = i % 2 === 0 ? emblemSize : emblemSize * 0.5;
      const px = centerX + Math.cos(angle) * radius;
      const py = centerY + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Inner star
    ctx.fillStyle = '#fff8dc';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const radius = i % 2 === 0 ? emblemSize * 0.4 : emblemSize * 0.2;
      const px = centerX + Math.cos(angle) * radius;
      const py = centerY + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Rotating light beams
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.1)';
    ctx.lineWidth = 30;
    for (let i = 0; i < 4; i++) {
      const angle = this.frameCount * 0.02 + i * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(angle) * w, centerY + Math.sin(angle) * h);
      ctx.stroke();
    }

    // "LEGENDARY" text glow
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('★ LEGENDARY ★', w / 2, h - 30);
    ctx.shadowBlur = 0;
  }

  private drawBall(): void {
    const ctx = this.ctx;
    const x = this.ballX;
    const y = this.ballY;
    const r = this.ballRadius;

    // Shadow
    ctx.beginPath();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.arc(x + 3, y + 3, r, 0, Math.PI * 2);
    ctx.fill();

    // Base ball color (changes for some levels)
    let ballColor = 'white';
    let patchColor = 'black';
    let lineColor = '#333';
    if (this.level >= 8 && this.level <= 10) {
      ballColor = '#ffcccc';
      patchColor = '#660000';
      lineColor = '#660000';
    }
    if (this.level === 20) {
      ballColor = '#fff8dc';
      patchColor = '#ffd700';
      lineColor = '#daa520';
    }

    // White ball base
    ctx.beginPath();
    ctx.fillStyle = ballColor;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Black border
    ctx.beginPath();
    ctx.strokeStyle = this.level === 20 ? '#ffd700' : 'black';
    ctx.lineWidth = 2;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    // Draw football pattern - center pentagon
    const centerPentR = r * 0.3;
    this.drawPentagon(x, y, centerPentR, patchColor);

    // Draw 5 outer pentagons around the edge
    const outerDist = r * 0.72;
    for (let i = 0; i < 5; i++) {
      const angle = (i * 72 - 90) * Math.PI / 180;
      const px = x + Math.cos(angle) * outerDist;
      const py = y + Math.sin(angle) * outerDist;
      this.drawPentagon(px, py, centerPentR * 0.8, patchColor);
    }

    // Draw connecting lines (hexagon pattern)
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;

    // Lines from center pentagon to outer pentagons
    for (let i = 0; i < 5; i++) {
      const angle1 = (i * 72 - 90) * Math.PI / 180;
      const angle2 = ((i + 1) * 72 - 90) * Math.PI / 180;

      // Center pentagon vertex
      const cx = x + Math.cos(angle1) * centerPentR;
      const cy = y + Math.sin(angle1) * centerPentR;

      // Outer pentagon position
      const ox = x + Math.cos(angle1) * outerDist;
      const oy = y + Math.sin(angle1) * outerDist;

      // Line from center to outer
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ox - Math.cos(angle1) * centerPentR * 0.8, oy - Math.sin(angle1) * centerPentR * 0.8);
      ctx.stroke();

      // Lines between outer pentagons (the hexagon edges)
      const nextOx = x + Math.cos(angle2) * outerDist;
      const nextOy = y + Math.sin(angle2) * outerDist;

      const midAngle = ((i * 72 + 36) - 90) * Math.PI / 180;
      const edgeDist = r * 0.55;
      const edgeX = x + Math.cos(midAngle) * edgeDist;
      const edgeY = y + Math.sin(midAngle) * edgeDist;

      ctx.beginPath();
      ctx.moveTo(ox + Math.cos(angle1 + Math.PI / 2.5) * centerPentR * 0.7,
                 oy + Math.sin(angle1 + Math.PI / 2.5) * centerPentR * 0.7);
      ctx.lineTo(edgeX, edgeY);
      ctx.lineTo(nextOx + Math.cos(angle2 - Math.PI / 2.5) * centerPentR * 0.7,
                 nextOy + Math.sin(angle2 - Math.PI / 2.5) * centerPentR * 0.7);
      ctx.stroke();
    }

    // Draw themed accessories based on level
    this.drawBallAccessories(x, y, r);
  }

  private drawPentagon(cx: number, cy: number, radius: number, color: string): void {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 72 - 90) * Math.PI / 180;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawBallAccessories(x: number, y: number, r: number): void {
    const ctx = this.ctx;

    if (this.level <= 3) {
      // GRASS: Simple football with maybe cleats marks
      // Draw cute eyes
      this.drawCuteEyes(x, y, r);
    } else if (this.level <= 5) {
      // DESERT: Arab keffiyeh (traditional headwear)
      this.drawKeffiyeh(x, y, r);
      this.drawCuteEyes(x, y, r);
      this.drawSweat(x, y, r); // It's hot!
    } else if (this.level <= 7) {
      // SNOW: Winter beanie and scarf
      this.drawWinterBeanie(x, y, r);
      this.drawScarf(x, y, r);
      this.drawCuteEyes(x, y, r);
    } else if (this.level <= 10) {
      // LAVA: Sunglasses (it's bright!) and flame effect
      this.drawFlameEffect(x, y, r);
      this.drawSunglasses(x, y, r);
    } else if (this.level <= 12) {
      // OCEAN: Diving goggles and snorkel
      this.drawDivingGoggles(x, y, r);
      this.drawSnorkel(x, y, r);
    } else if (this.level <= 15) {
      // SPACE: Astronaut helmet
      this.drawAstronautHelmet(x, y, r);
    } else if (this.level <= 17) {
      // CYBER: VR visor with glow
      this.drawCyberVisor(x, y, r);
    } else if (this.level <= 19) {
      // CHAOS: Crazy eyes and wild hair
      this.drawCrazyEyes(x, y, r);
      this.drawWildHair(x, y, r);
    } else {
      // LEGENDARY: Crown and golden glow
      this.drawGoldenGlow(x, y, r);
      this.drawCrown(x, y, r);
      this.drawProudEyes(x, y, r);
    }
  }

  private drawCuteEyes(x: number, y: number, r: number): void {
    const ctx = this.ctx;
    const eyeOffsetX = r * 0.25;
    const eyeOffsetY = -r * 0.1;
    const eyeSize = r * 0.15;

    // Left eye white
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(x - eyeOffsetX, y + eyeOffsetY, eyeSize, eyeSize * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Left pupil
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(x - eyeOffsetX + 2, y + eyeOffsetY, eyeSize * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Right eye white
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(x + eyeOffsetX, y + eyeOffsetY, eyeSize, eyeSize * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Right pupil
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(x + eyeOffsetX + 2, y + eyeOffsetY, eyeSize * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x - eyeOffsetX + 1, y + eyeOffsetY - 2, eyeSize * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + eyeOffsetX + 1, y + eyeOffsetY - 2, eyeSize * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawKeffiyeh(x: number, y: number, r: number): void {
    const ctx = this.ctx;

    // Main headpiece (white with red pattern)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.3, r * 1.1, Math.PI, 0, false);
    ctx.fill();

    // Red checkered pattern bands
    ctx.strokeStyle = '#cc0000';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x, y - r * 0.3, r * (0.85 + i * 0.1), Math.PI + 0.3, -0.3, false);
      ctx.stroke();
    }

    // Black agal (rope) on top
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y - r * 0.5, r * 0.7, Math.PI + 0.5, -0.5, false);
    ctx.stroke();

    // Draping sides
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.9, y - r * 0.2);
    ctx.quadraticCurveTo(x - r * 1.2, y + r * 0.5, x - r * 0.7, y + r * 1.1);
    ctx.lineTo(x - r * 0.5, y + r * 0.3);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + r * 0.9, y - r * 0.2);
    ctx.quadraticCurveTo(x + r * 1.2, y + r * 0.5, x + r * 0.7, y + r * 1.1);
    ctx.lineTo(x + r * 0.5, y + r * 0.3);
    ctx.fill();
  }

  private drawSweat(x: number, y: number, r: number): void {
    const ctx = this.ctx;
    // Sweat drops
    ctx.fillStyle = '#87ceeb';
    const sweatY = y + r * 0.2 + Math.sin(this.frameCount * 0.1) * 3;

    ctx.beginPath();
    ctx.moveTo(x + r * 0.5, sweatY);
    ctx.quadraticCurveTo(x + r * 0.6, sweatY + 8, x + r * 0.5, sweatY + 12);
    ctx.quadraticCurveTo(x + r * 0.4, sweatY + 8, x + r * 0.5, sweatY);
    ctx.fill();
  }

  private drawWinterBeanie(x: number, y: number, r: number): void {
    const ctx = this.ctx;

    // Beanie base (red)
    ctx.fillStyle = '#cc2222';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.2, r * 1.05, Math.PI, 0, false);
    ctx.fill();

    // Beanie top part
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.9, r * 0.5, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // White stripe
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.2, r * 1.05, Math.PI + 0.3, -0.3, false);
    ctx.arc(x, y - r * 0.2, r * 0.85, -0.3, Math.PI + 0.3, true);
    ctx.fill();

    // Pom pom
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y - r * 1.3, r * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Pom pom texture
    ctx.fillStyle = '#eeeeee';
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(angle) * r * 0.15,
        y - r * 1.3 + Math.sin(angle) * r * 0.15,
        r * 0.08,
        0, Math.PI * 2
      );
      ctx.fill();
    }
  }

  private drawScarf(x: number, y: number, r: number): void {
    const ctx = this.ctx;

    // Scarf wrap around
    ctx.fillStyle = '#22cc22';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.7, r * 0.9, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Scarf hanging part
    ctx.fillStyle = '#22cc22';
    ctx.beginPath();
    ctx.moveTo(x + r * 0.3, y + r * 0.8);
    ctx.quadraticCurveTo(x + r * 0.5, y + r * 1.2, x + r * 0.3, y + r * 1.5);
    ctx.lineTo(x + r * 0.1, y + r * 1.4);
    ctx.quadraticCurveTo(x + r * 0.2, y + r * 1.1, x + r * 0.1, y + r * 0.8);
    ctx.fill();

    // Scarf stripes
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.7, y + r * 0.65);
    ctx.lineTo(x + r * 0.7, y + r * 0.65);
    ctx.stroke();
  }

  private drawFlameEffect(x: number, y: number, r: number): void {
    const ctx = this.ctx;

    // Flame particles around the ball
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + this.frameCount * 0.1;
      const flameX = x + Math.cos(angle) * (r + 5);
      const flameY = y + Math.sin(angle) * (r + 5);
      const flameSize = 8 + Math.sin(this.frameCount * 0.2 + i) * 4;

      const gradient = ctx.createRadialGradient(flameX, flameY, 0, flameX, flameY, flameSize);
      gradient.addColorStop(0, '#ffff00');
      gradient.addColorStop(0.5, '#ff6600');
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(flameX, flameY, flameSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawSunglasses(x: number, y: number, r: number): void {
    const ctx = this.ctx;
    const glassY = y - r * 0.05;

    // Frame
    ctx.fillStyle = '#1a1a1a';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 3;

    // Bridge
    ctx.beginPath();
    ctx.moveTo(x - r * 0.1, glassY);
    ctx.lineTo(x + r * 0.1, glassY);
    ctx.stroke();

    // Left lens
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.3, glassY, r * 0.22, r * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Right lens
    ctx.beginPath();
    ctx.ellipse(x + r * 0.3, glassY, r * 0.22, r * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Lens shine
    ctx.strokeStyle = 'rgba(255, 100, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x - r * 0.35, glassY - r * 0.05, r * 0.08, Math.PI, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + r * 0.25, glassY - r * 0.05, r * 0.08, Math.PI, Math.PI * 1.5);
    ctx.stroke();

    // Arms going to sides
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, glassY);
    ctx.lineTo(x - r * 0.9, glassY - r * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + r * 0.5, glassY);
    ctx.lineTo(x + r * 0.9, glassY - r * 0.1);
    ctx.stroke();
  }

  private drawDivingGoggles(x: number, y: number, r: number): void {
    const ctx = this.ctx;
    const goggleY = y - r * 0.1;

    // Strap
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.95, Math.PI + 0.8, -0.8, false);
    ctx.stroke();

    // Goggle frame
    ctx.fillStyle = '#2196F3';
    ctx.beginPath();
    ctx.ellipse(x, goggleY, r * 0.6, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Goggle glass
    ctx.fillStyle = 'rgba(135, 206, 250, 0.7)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.22, goggleY, r * 0.2, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + r * 0.22, goggleY, r * 0.2, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glass shine
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x - r * 0.28, goggleY - r * 0.08, r * 0.08, Math.PI, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + r * 0.16, goggleY - r * 0.08, r * 0.08, Math.PI, Math.PI * 1.5);
    ctx.stroke();

    // Nose bridge
    ctx.fillStyle = '#1976D2';
    ctx.fillRect(x - r * 0.05, goggleY - r * 0.05, r * 0.1, r * 0.15);
  }

  private drawSnorkel(x: number, y: number, r: number): void {
    const ctx = this.ctx;

    // Snorkel tube
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + r * 0.8, y);
    ctx.quadraticCurveTo(x + r * 1.3, y - r * 0.5, x + r * 1.1, y - r * 1.2);
    ctx.stroke();

    // Snorkel top
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.ellipse(x + r * 1.1, y - r * 1.35, r * 0.12, r * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mouthpiece
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.75, y + r * 0.1, r * 0.1, r * 0.15, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawAstronautHelmet(x: number, y: number, r: number): void {
    const ctx = this.ctx;

    // Helmet dome (slightly bigger than ball)
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.2, 0, Math.PI * 2);
    ctx.stroke();

    // Helmet base
    ctx.fillStyle = '#888888';
    ctx.beginPath();
    ctx.arc(x, y, r * 1.2, 0.3, Math.PI - 0.3, false);
    ctx.lineTo(x - r * 1.1, y + r * 0.5);
    ctx.lineTo(x + r * 1.1, y + r * 0.5);
    ctx.fill();

    // Visor (reflective)
    const visorGradient = ctx.createLinearGradient(x - r, y - r * 0.5, x + r, y + r * 0.3);
    visorGradient.addColorStop(0, '#ffd700');
    visorGradient.addColorStop(0.5, '#ff8c00');
    visorGradient.addColorStop(1, '#ffd700');
    ctx.fillStyle = visorGradient;
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.1, r * 0.85, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Visor frame
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Reflection on visor
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, Math.PI, Math.PI * 1.4);
    ctx.stroke();

    // Side lights
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(x - r * 1.1, y, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(x + r * 1.1, y, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCyberVisor(x: number, y: number, r: number): void {
    const ctx = this.ctx;
    const neonColor = this.level === 16 ? '#00ff88' : '#ff00ff';

    // Visor
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.8, y - r * 0.1);
    ctx.lineTo(x + r * 0.8, y - r * 0.1);
    ctx.lineTo(x + r * 0.7, y + r * 0.15);
    ctx.lineTo(x - r * 0.7, y + r * 0.15);
    ctx.closePath();
    ctx.fill();

    // Glowing line on visor
    ctx.strokeStyle = neonColor;
    ctx.shadowColor = neonColor;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.7, y);
    ctx.lineTo(x + r * 0.7, y);
    ctx.stroke();

    // Scanning effect
    const scanX = x - r * 0.6 + ((this.frameCount * 3) % (r * 1.2));
    ctx.fillStyle = neonColor;
    ctx.fillRect(scanX, y - r * 0.08, 3, r * 0.2);

    ctx.shadowBlur = 0;

    // Side attachments
    ctx.fillStyle = '#333333';
    ctx.fillRect(x - r * 0.95, y - r * 0.15, r * 0.15, r * 0.3);
    ctx.fillRect(x + r * 0.8, y - r * 0.15, r * 0.15, r * 0.3);

    // Glowing dots
    ctx.fillStyle = neonColor;
    ctx.beginPath();
    ctx.arc(x - r * 0.88, y, r * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + r * 0.88, y, r * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCrazyEyes(x: number, y: number, r: number): void {
    const ctx = this.ctx;
    const eyeOffsetX = r * 0.3;
    const eyeOffsetY = -r * 0.1;

    // Left eye (big and crazy)
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(x - eyeOffsetX, y + eyeOffsetY, r * 0.25, r * 0.3, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Left pupil (spinning)
    const pupilAngle = this.frameCount * 0.1;
    const pupilX = x - eyeOffsetX + Math.cos(pupilAngle) * r * 0.08;
    const pupilY = y + eyeOffsetY + Math.sin(pupilAngle) * r * 0.08;
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(pupilX, pupilY, r * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Right eye (different size)
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(x + eyeOffsetX, y + eyeOffsetY - r * 0.05, r * 0.2, r * 0.25, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.stroke();

    // Right pupil (spinning opposite)
    const pupil2X = x + eyeOffsetX + Math.cos(-pupilAngle) * r * 0.06;
    const pupil2Y = y + eyeOffsetY - r * 0.05 + Math.sin(-pupilAngle) * r * 0.06;
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(pupil2X, pupil2Y, r * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Spiral in eyes
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const spiralR = r * 0.05 * (i + 1);
      ctx.arc(pupilX, pupilY, spiralR, pupilAngle, pupilAngle + Math.PI);
    }
    ctx.stroke();

    // Crazy eyebrows
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y - r * 0.35);
    ctx.lineTo(x - r * 0.1, y - r * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + r * 0.5, y - r * 0.5);
    ctx.lineTo(x + r * 0.1, y - r * 0.35);
    ctx.stroke();
  }

  private drawWildHair(x: number, y: number, r: number): void {
    const ctx = this.ctx;

    // Wild colorful hair spikes
    const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#ff00ff', '#00ffff'];

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI - Math.PI / 2 + Math.sin(this.frameCount * 0.1 + i) * 0.1;
      const spikeLength = r * (0.5 + Math.random() * 0.3);
      const baseX = x + Math.cos(angle) * r * 0.9;
      const baseY = y + Math.sin(angle) * r * 0.9;
      const tipX = x + Math.cos(angle) * (r + spikeLength);
      const tipY = y + Math.sin(angle) * (r + spikeLength);

      ctx.strokeStyle = colors[i % colors.length];
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(
        baseX + Math.cos(angle + 0.5) * spikeLength * 0.3,
        baseY + Math.sin(angle + 0.5) * spikeLength * 0.3,
        tipX, tipY
      );
      ctx.stroke();
    }
  }

  private drawGoldenGlow(x: number, y: number, r: number): void {
    const ctx = this.ctx;

    // Pulsing golden aura
    const pulseSize = r * 1.5 + Math.sin(this.frameCount * 0.1) * r * 0.2;
    const glowGradient = ctx.createRadialGradient(x, y, r, x, y, pulseSize);
    glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
    glowGradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.2)');
    glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
    ctx.fill();

    // Sparkles around
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 8; i++) {
      const sparkleAngle = (i / 8) * Math.PI * 2 + this.frameCount * 0.05;
      const sparkleR = r * 1.3 + Math.sin(this.frameCount * 0.1 + i) * 5;
      const sparkleX = x + Math.cos(sparkleAngle) * sparkleR;
      const sparkleY = y + Math.sin(sparkleAngle) * sparkleR;

      // 4-point star sparkle
      ctx.beginPath();
      ctx.moveTo(sparkleX, sparkleY - 4);
      ctx.lineTo(sparkleX + 1, sparkleY);
      ctx.lineTo(sparkleX, sparkleY + 4);
      ctx.lineTo(sparkleX - 1, sparkleY);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(sparkleX - 4, sparkleY);
      ctx.lineTo(sparkleX, sparkleY + 1);
      ctx.lineTo(sparkleX + 4, sparkleY);
      ctx.lineTo(sparkleX, sparkleY - 1);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawCrown(x: number, y: number, r: number): void {
    const ctx = this.ctx;

    // Crown base
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.7, y - r * 0.6);
    ctx.lineTo(x - r * 0.8, y - r * 1.1);
    ctx.lineTo(x - r * 0.4, y - r * 0.85);
    ctx.lineTo(x, y - r * 1.3);
    ctx.lineTo(x + r * 0.4, y - r * 0.85);
    ctx.lineTo(x + r * 0.8, y - r * 1.1);
    ctx.lineTo(x + r * 0.7, y - r * 0.6);
    ctx.closePath();
    ctx.fill();

    // Crown outline
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Jewels
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(x, y - r * 1.15, r * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0000ff';
    ctx.beginPath();
    ctx.arc(x - r * 0.5, y - r * 0.85, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + r * 0.5, y - r * 0.85, r * 0.07, 0, Math.PI * 2);
    ctx.fill();

    // Crown band
    ctx.fillStyle = '#b8860b';
    ctx.fillRect(x - r * 0.7, y - r * 0.65, r * 1.4, r * 0.12);
  }

  private drawProudEyes(x: number, y: number, r: number): void {
    const ctx = this.ctx;
    const eyeOffsetX = r * 0.25;
    const eyeOffsetY = -r * 0.05;

    // Confident closed eyes (like ^_^)
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    // Left eye - curved line
    ctx.beginPath();
    ctx.arc(x - eyeOffsetX, y + eyeOffsetY + r * 0.05, r * 0.15, Math.PI + 0.5, -0.5, true);
    ctx.stroke();

    // Right eye - curved line
    ctx.beginPath();
    ctx.arc(x + eyeOffsetX, y + eyeOffsetY + r * 0.05, r * 0.15, Math.PI + 0.5, -0.5, true);
    ctx.stroke();

    // Proud smile
    ctx.beginPath();
    ctx.arc(x, y + r * 0.25, r * 0.2, 0.2, Math.PI - 0.2, false);
    ctx.stroke();

    // Blush
    ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.4, y + r * 0.15, r * 0.12, r * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + r * 0.4, y + r * 0.15, r * 0.12, r * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawUI(bg: { grass: string; lines: string; name: string }): void {
    const ctx = this.ctx;

    // Score text (top center) with shadow for visibility
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(String(this.score), this.canvasWidth / 2, 60);

    // Level indicator (top left)
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Lv.${this.level}`, 15, 30);

    // Level name (top left, below level number)
    ctx.font = '12px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(bg.name, 15, 48);

    ctx.shadowBlur = 0;
  }

  @HostListener('document:click', ['$event'])
  @HostListener('document:touchstart', ['$event'])
  onInteraction(event: MouseEvent | TouchEvent): void {
    if (this.gameState !== 'playing') return;

    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    let clientX: number, clientY: number;
    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    }

    // Account for CSS scaling - convert screen coords to canvas coords
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    // Check if click is within canvas bounds
    if (x < 0 || x > this.canvasWidth || y < 0 || y > this.canvasHeight) return;

    // Check if click is on the ball (with some tolerance)
    const distance = Math.sqrt((x - this.ballX) ** 2 + (y - this.ballY) ** 2);
    const hitRadius = this.ballRadius * 2.5; // Very forgiving hit area

    if (distance < hitRadius) {
      this.kickBall(x, y);
    }
  }

  private kickBall(clickX: number, clickY: number): void {
    // Show kick effect
    this.kickEffect = { x: clickX, y: clickY, frame: 10 };

    // Calculate kick direction (opposite to click position relative to ball center)
    const dx = this.ballX - clickX;
    const dy = this.ballY - clickY;

    // Normalize and apply kick force (slightly stronger at higher levels to compensate)
    const kickPower = 10 + (this.level - 1) * 0.3;
    const magnitude = Math.sqrt(dx * dx + dy * dy) || 1;

    this.ballVelocityX += (dx / magnitude) * kickPower * 0.3;
    this.ballVelocityY = -kickPower; // Always kick upward

    // Increment score
    this.score++;

    // Check for level up (every 10 bounces)
    const newLevel = Math.min(20, Math.floor(this.score / 10) + 1);
    if (newLevel > this.level) {
      this.level = newLevel;
      // Gradually increase gravity
      this.gravity = this.baseGravity + (this.level - 1) * 0.02;
    }

    // Add some randomness
    this.ballVelocityX += (Math.random() - 0.5) * 2;
  }

  private endGame(): void {
    this.gameState = 'gameover';
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    // Update high score
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('footballGameHighScore', this.highScore.toString());
    }

    // Submit score to leaderboard
    this.submitScore();
  }

  private loadHighScore(): void {
    const saved = localStorage.getItem('footballGameHighScore');
    if (saved) {
      this.highScore = parseInt(saved, 10);
    }
  }

  private loadLeaderboard(): void {
    this.isLoadingLeaderboard = true;
    this.http.get<{ success: boolean; data: LeaderboardEntry[] }>(
      `${environment.apiUrl}/game/leaderboard`
    ).subscribe({
      next: (response) => {
        this.leaderboard = response.data;
        this.isLoadingLeaderboard = false;
      },
      error: () => {
        this.isLoadingLeaderboard = false;
      }
    });
  }

  private submitScore(): void {
    if (this.score === 0) return;

    this.http.post<{ success: boolean; data: LeaderboardEntry }>(
      `${environment.apiUrl}/game/score`,
      { score: this.score }
    ).subscribe({
      next: () => {
        this.loadLeaderboard();
      },
      error: (err) => {
        console.error('Failed to submit score:', err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/groups']);
  }

  toggleLeaderboard(): void {
    this.showLeaderboard = !this.showLeaderboard;
  }
}
