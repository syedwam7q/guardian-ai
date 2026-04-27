import { OrbitControls, Text } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { DAG_EDGES, DAG_NODES, NODE_POSITIONS, RANKED_CAUSES } from "@/lib/mockDag";

const SCALE_X = 1.4;
const SCALE_Y = 1.0;

function pos3(id: string): [number, number, number] {
  const p = NODE_POSITIONS[id];
  return [p.x * SCALE_X - 4, -p.y * SCALE_Y + 1, 0];
}

function nodeMaterialColor(id: string, kind: string): string {
  if (kind === "outcome") return "#f87171";
  const top = RANKED_CAUSES.find((c) => c.node === id);
  if (top && top.rank === 1) return "#a78bfa";
  if (top && top.rank === 2) return "#7c5dfa";
  if (top && top.rank <= 3) return "#60a5fa";
  if (kind === "exogenous") return "#475e8b";
  return "#3a4866";
}

interface SphereProps {
  id: string;
  kind: string;
}

function Sphere({ id, kind }: SphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const isTop = RANKED_CAUSES.find((c) => c.node === id)?.rank === 1;
  const isOutcome = kind === "outcome";
  const baseColor = nodeMaterialColor(id, kind);
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    if (isTop || isOutcome) {
      const t = clock.getElapsedTime();
      const s = 1 + Math.sin(t * 2.4) * 0.07;
      meshRef.current.scale.setScalar(s);
    }
  });

  return (
    <group position={pos3(id)}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.32, 24, 24]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={isTop ? 0.85 : isOutcome ? 0.7 : 0.25}
          roughness={0.35}
          metalness={0.4}
        />
      </mesh>
      <Text
        position={[0, -0.55, 0]}
        fontSize={0.16}
        color="#97a3bd"
        anchorX="center"
        anchorY="middle"
      >
        {id}
      </Text>
    </group>
  );
}

interface EdgeLineProps {
  source: string;
  target: string;
}

function EdgeLine({ source, target }: EdgeLineProps) {
  const points = useMemo(() => {
    const a = pos3(source);
    const b = pos3(target);
    return new Float32Array([...a, ...b]);
  }, [source, target]);

  const ranks = [source, target].map(
    (n) => RANKED_CAUSES.find((c) => c.node === n)?.rank ?? 99,
  );
  const top = Math.min(...ranks);
  const color =
    top === 1
      ? "#f87171"
      : top === 2
        ? "#a78bfa"
        : top <= 3
          ? "#60a5fa"
          : "#2d3b5e";

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[points, 3]}
          count={2}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} linewidth={1.5} transparent opacity={0.7} />
    </line>
  );
}

export function CausalGraph3D() {
  return (
    <div className="h-full w-full overflow-hidden rounded-md border border-border-subtle bg-bg-deep">
      <Canvas camera={{ position: [0, 0, 9], fov: 45 }}>
        <ambientLight intensity={0.45} />
        <pointLight position={[5, 5, 5]} intensity={1.2} />
        <pointLight position={[-5, -3, 5]} intensity={0.5} color="#a78bfa" />

        {DAG_NODES.map((n) => (
          <Sphere key={n.id} id={n.id} kind={n.kind} />
        ))}
        {DAG_EDGES.map((e, i) => (
          <EdgeLine key={i} source={e.source} target={e.target} />
        ))}

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          autoRotate
          autoRotateSpeed={0.6}
          minDistance={5}
          maxDistance={16}
        />
      </Canvas>
    </div>
  );
}
