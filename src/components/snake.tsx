import { useEffect, useRef } from "react";

const Snake = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Input handling
    const Input = {
      keys: new Array(230).fill(false),
      mouse: { left: false, right: false, middle: false, x: 0, y: 0 }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      Input.keys[event.keyCode] = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      Input.keys[event.keyCode] = false;
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 0) Input.mouse.left = true;
      if (event.button === 1) Input.mouse.middle = true;
      if (event.button === 2) Input.mouse.right = true;
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (event.button === 0) Input.mouse.left = false;
      if (event.button === 1) Input.mouse.middle = false;
      if (event.button === 2) Input.mouse.right = false;
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      Input.mouse.x = event.clientX - rect.left;
      Input.mouse.y = event.clientY - rect.top;
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);

    // Classes
    let segmentCount = 0;

    class Segment {
      isSegment = true;
      parent: any;
      children: Segment[] = [];
      size: number;
      relAngle: number;
      defAngle: number;
      absAngle: number;
      range: number;
      stiffness: number;
      x = 0;
      y = 0;

      constructor(parent: any, size: number, angle: number, range: number, stiffness: number) {
        segmentCount++;
        this.parent = parent;
        if (parent.children) {
          parent.children.push(this);
        }
        this.size = size;
        this.relAngle = angle;
        this.defAngle = angle;
        this.absAngle = parent.absAngle + angle;
        this.range = range;
        this.stiffness = stiffness;
        this.updateRelative(false, true);
      }

      updateRelative(iter: boolean, flex: boolean) {
        this.relAngle = this.relAngle - 2 * Math.PI * Math.floor((this.relAngle - this.defAngle) / 2 / Math.PI + 1 / 2);
        if (flex) {
          this.relAngle = Math.min(
            this.defAngle + this.range / 2,
            Math.max(
              this.defAngle - this.range / 2,
              (this.relAngle - this.defAngle) / this.stiffness + this.defAngle
            )
          );
        }
        this.absAngle = this.parent.absAngle + this.relAngle;
        this.x = this.parent.x + Math.cos(this.absAngle) * this.size;
        this.y = this.parent.y + Math.sin(this.absAngle) * this.size;

        if (iter) {
          for (let i = 0; i < this.children.length; i++) {
            this.children[i].updateRelative(iter, flex);
          }
        }
      }

      draw(iter: boolean) {
        ctx.beginPath();
        ctx.moveTo(this.parent.x, this.parent.y);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();

        if (iter) {
          for (let i = 0; i < this.children.length; i++) {
            this.children[i].draw(true);
          }
        }
      }

      follow(iter: boolean) {
        const x = this.parent.x;
        const y = this.parent.y;
        const dist = Math.sqrt((this.x - x) ** 2 + (this.y - y) ** 2);
        this.x = x + this.size * (this.x - x) / dist;
        this.y = y + this.size * (this.y - y) / dist;
        this.absAngle = Math.atan2(this.y - y, this.x - x);
        this.relAngle = this.absAngle - this.parent.absAngle;
        this.updateRelative(false, true);

        if (iter) {
          for (let i = 0; i < this.children.length; i++) {
            this.children[i].follow(true);
          }
        }
      }
    }

    class LimbSystem {
      end: Segment;
      length: number;
      creature: Creature;
      speed: number;
      nodes: Segment[] = [];
      hip: any;

      constructor(end: Segment, length: number, speed: number, creature: Creature) {
        this.end = end;
        this.length = Math.max(1, length);
        this.creature = creature;
        this.speed = speed;
        creature.systems.push(this);

        let node: any = end;
        for (let i = 0; i < length; i++) {
          this.nodes.unshift(node);
          node = node.parent;
          if (!node.isSegment) {
            this.length = i + 1;
            break;
          }
        }
        this.hip = this.nodes[0].parent;
      }

      moveTo(x: number, y: number) {
        this.nodes[0].updateRelative(true, true);
        const dist = Math.sqrt((x - this.end.x) ** 2 + (y - this.end.y) ** 2);
        let len = Math.max(0, dist - this.speed);

        for (let i = this.nodes.length - 1; i >= 0; i--) {
          const node = this.nodes[i];
          const ang = Math.atan2(node.y - y, node.x - x);
          node.x = x + len * Math.cos(ang);
          node.y = y + len * Math.sin(ang);
          x = node.x;
          y = node.y;
          len = node.size;
        }

        for (let i = 0; i < this.nodes.length; i++) {
          const node = this.nodes[i];
          node.absAngle = Math.atan2(node.y - node.parent.y, node.x - node.parent.x);
          node.relAngle = node.absAngle - node.parent.absAngle;

          for (let ii = 0; ii < node.children.length; ii++) {
            const childNode = node.children[ii];
            if (!this.nodes.includes(childNode)) {
              childNode.updateRelative(true, false);
            }
          }
        }
      }

      update() {
        this.moveTo(Input.mouse.x, Input.mouse.y);
      }
    }

    class LegSystem extends LimbSystem {
      goalX: number;
      goalY: number;
      step = 0;
      forwardness = 0;
      reach: number;
      swing: number;
      swingOffset: number;

      constructor(end: Segment, length: number, speed: number, creature: Creature) {
        super(end, length, speed, creature);
        this.goalX = end.x;
        this.goalY = end.y;
        this.reach = 0.9 * Math.sqrt((this.end.x - this.hip.x) ** 2 + (this.end.y - this.hip.y) ** 2);

        let relAngle = this.creature.absAngle - Math.atan2(this.end.y - this.hip.y, this.end.x - this.hip.x);
        relAngle -= 2 * Math.PI * Math.floor(relAngle / 2 / Math.PI + 1 / 2);
        this.swing = -relAngle + (2 * (relAngle < 0 ? 1 : 0) - 1) * Math.PI / 2;
        this.swingOffset = this.creature.absAngle - this.hip.absAngle;
      }

      update() {
        this.moveTo(this.goalX, this.goalY);

        if (this.step === 0) {
          const dist = Math.sqrt((this.end.x - this.goalX) ** 2 + (this.end.y - this.goalY) ** 2);
          if (dist > 1) {
            this.step = 1;
            this.goalX = this.hip.x + this.reach * Math.cos(this.swing + this.hip.absAngle + this.swingOffset) + (2 * Math.random() - 1) * this.reach / 2;
            this.goalY = this.hip.y + this.reach * Math.sin(this.swing + this.hip.absAngle + this.swingOffset) + (2 * Math.random() - 1) * this.reach / 2;
          }
        } else if (this.step === 1) {
          const theta = Math.atan2(this.end.y - this.hip.y, this.end.x - this.hip.x) - this.hip.absAngle;
          const dist = Math.sqrt((this.end.x - this.hip.x) ** 2 + (this.end.y - this.hip.y) ** 2);
          const forwardness2 = dist * Math.cos(theta);
          const dF = this.forwardness - forwardness2;
          this.forwardness = forwardness2;

          if (dF * dF < 1) {
            this.step = 0;
            this.goalX = this.hip.x + (this.end.x - this.hip.x);
            this.goalY = this.hip.y + (this.end.y - this.hip.y);
          }
        }
      }
    }

    class Creature {
      x: number;
      y: number;
      absAngle: number;
      fSpeed = 0;
      fAccel: number;
      fFric: number;
      fRes: number;
      fThresh: number;
      rSpeed = 0;
      rAccel: number;
      rFric: number;
      rRes: number;
      rThresh: number;
      children: Segment[] = [];
      systems: (LimbSystem | LegSystem)[] = [];
      speed = 0;

      constructor(x: number, y: number, angle: number, fAccel: number, fFric: number, fRes: number, fThresh: number, rAccel: number, rFric: number, rRes: number, rThresh: number) {
        this.x = x;
        this.y = y;
        this.absAngle = angle;
        this.fAccel = fAccel;
        this.fFric = fFric;
        this.fRes = fRes;
        this.fThresh = fThresh;
        this.rAccel = rAccel;
        this.rFric = rFric;
        this.rRes = rRes;
        this.rThresh = rThresh;
      }

      follow(x: number, y: number) {
        const dist = Math.sqrt((this.x - x) ** 2 + (this.y - y) ** 2);
        const angle = Math.atan2(y - this.y, x - this.x);

        // Update forward
        let accel = this.fAccel;
        if (this.systems.length > 0) {
          let sum = 0;
          for (let i = 0; i < this.systems.length; i++) {
            sum += (this.systems[i] as LegSystem).step === 0 ? 1 : 0;
          }
          accel *= sum / this.systems.length;
        }

        this.fSpeed += accel * (dist > this.fThresh ? 1 : 0);
        this.fSpeed *= 1 - this.fRes;
        this.speed = Math.max(0, this.fSpeed - this.fFric);

        // Update rotation
        let dif = this.absAngle - angle;
        dif -= 2 * Math.PI * Math.floor(dif / (2 * Math.PI) + 1 / 2);

        if (Math.abs(dif) > this.rThresh && dist > this.fThresh) {
          this.rSpeed -= this.rAccel * (2 * (dif > 0 ? 1 : 0) - 1);
        }

        this.rSpeed *= 1 - this.rRes;
        if (Math.abs(this.rSpeed) > this.rFric) {
          this.rSpeed -= this.rFric * (2 * (this.rSpeed > 0 ? 1 : 0) - 1);
        } else {
          this.rSpeed = 0;
        }

        // Update position
        this.absAngle += this.rSpeed;
        this.absAngle -= 2 * Math.PI * Math.floor(this.absAngle / (2 * Math.PI) + 1 / 2);
        this.x += this.speed * Math.cos(this.absAngle);
        this.y += this.speed * Math.sin(this.absAngle);

        this.absAngle += Math.PI;
        for (let i = 0; i < this.children.length; i++) {
          this.children[i].follow(true);
        }
        for (let i = 0; i < this.systems.length; i++) {
          this.systems[i].update();
        }
        this.absAngle -= Math.PI;

        this.draw(true);
      }

      draw(iter: boolean) {
        const r = 4;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, Math.PI / 4 + this.absAngle, 7 * Math.PI / 4 + this.absAngle);
        ctx.moveTo(
          this.x + r * Math.cos(7 * Math.PI / 4 + this.absAngle),
          this.y + r * Math.sin(7 * Math.PI / 4 + this.absAngle)
        );
        ctx.lineTo(
          this.x + r * Math.cos(this.absAngle) * Math.sqrt(2),
          this.y + r * Math.sin(this.absAngle) * Math.sqrt(2)
        );
        ctx.lineTo(
          this.x + r * Math.cos(Math.PI / 4 + this.absAngle),
          this.y + r * Math.sin(Math.PI / 4 + this.absAngle)
        );
        ctx.stroke();

        if (iter) {
          for (let i = 0; i < this.children.length; i++) {
            this.children[i].draw(true);
          }
        }
      }
    }

    // Setup functions
    function setupLizard(size: number, legs: number, tail: number) {
      const s = size;
      const critter = new Creature(
        window.innerWidth / 2,
        window.innerHeight / 2,
        0,
        s * 10,
        s * 2,
        0.5,
        16,
        0.5,
        0.085,
        0.5,
        0.3
      );

      let spinal: any = critter;

      // Neck
      for (let i = 0; i < 6; i++) {
        spinal = new Segment(spinal, s * 4, 0, 3.1415 * 2 / 3, 1.1);
        for (let ii = -1; ii <= 1; ii += 2) {
          let node = new Segment(spinal, s * 3, ii, 0.1, 2);
          for (let iii = 0; iii < 3; iii++) {
            node = new Segment(node, s * 0.1, -ii * 0.1, 0.1, 2);
          }
        }
      }

      // Torso and legs
      for (let i = 0; i < legs; i++) {
        if (i > 0) {
          // Vertebrae and ribs
          for (let ii = 0; ii < 6; ii++) {
            spinal = new Segment(spinal, s * 4, 0, 1.571, 1.5);
            for (let iii = -1; iii <= 1; iii += 2) {
              let node = new Segment(spinal, s * 3, iii * 1.571, 0.1, 1.5);
              for (let iv = 0; iv < 3; iv++) {
                node = new Segment(node, s * 3, -iii * 0.3, 0.1, 2);
              }
            }
          }
        }

        // Legs and shoulders
        for (let ii = -1; ii <= 1; ii += 2) {
          let node = new Segment(spinal, s * 12, ii * 0.785, 0, 8); // Hip
          node = new Segment(node, s * 16, -ii * 0.785, 6.28, 1); // Humerus
          node = new Segment(node, s * 16, ii * 1.571, 3.1415, 2); // Forearm
          for (let iii = 0; iii < 4; iii++) { // fingers
            new Segment(node, s * 4, (iii / 3 - 0.5) * 1.571, 0.1, 4);
          }
          new LegSystem(node, 3, s * 6, critter); // Reduced from s * 12 to s * 6
        }
      }

      // Tail
      for (let i = 0; i < tail; i++) {
        spinal = new Segment(spinal, s * 4, 0, 3.1415 * 2 / 3, 1.1);
        for (let ii = -1; ii <= 1; ii += 2) {
          let node = new Segment(spinal, s * 3, ii, 0.1, 2);
          for (let iii = 0; iii < 3; iii++) {
            node = new Segment(node, s * 3 * (tail - i) / tail, -ii * 0.1, 0.1, 2);
          }
        }
      }

      return critter;
    }

    // Initialize
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;

    const legNum = Math.floor(2 + Math.random() * 8);
    const critter = setupLizard(
      12 / Math.sqrt(legNum),
      legNum,
      Math.floor(4 + Math.random() * legNum * 6)
    );

    // Animation loop
    const animate = () => {
      // Semi-transparent clear for trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Reset stroke style for creature
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;

      // Make creature follow the mouse cursor
      critter.follow(Input.mouse.x, Input.mouse.y);
      requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        position: "fixed", 
        top: 0, 
        left: 0, 
        width: "100%", 
        height: "100%", 
        backgroundColor: "#000", 
        cursor: "crosshair", 
        zIndex: 0, 
      }} 
    />
  );
};

export default Snake;