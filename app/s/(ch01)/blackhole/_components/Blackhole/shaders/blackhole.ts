/**
 * 1:1 port of Shadertoy https://www.shadertoy.com/view/tsBXW3
 * “Black hole with accretion disk”
 *
 * Changes from original:
 * - iMouse → uniforms uYaw / uPitch (+ fixed MOUSE_X zoom)
 * - _Size → uniform uSize (panel scale)
 * - iChannel0 nebula → seamless 3D noise on ray dir (no cubemap UV seams)
 * - iTime / iResolution wired as uniforms
 * - AA=1 for monitor perf (was typically 2+)
 */

export const blackholeVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const blackholeFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec3 iResolution;
uniform float iTime;
uniform float uSize;
uniform float uYaw;
uniform float uPitch;
uniform float uBeltAngle;
uniform float uSpeed;
uniform vec3 uHoleColor;
uniform float uHoleBoost;
uniform vec3 uNebulaColor;
uniform float uNebulaIntensity;

// Shadertoy custom params (defaults from set111 / tsBXW3)
#define _Size uSize
#define _Speed uSpeed
const float _Steps = 12.0;
const int AA = 1;
// Avoid /0 when camera sits in the disk plane (pitch ≈ 0 → ray.y ≈ 0)
const float RAY_Y_EPS = 1e-3;

// Fixed zoom — was iMouse.x / iResolution.y (0 → camera z ≈ -5)
const float MOUSE_X = 0.0;

float hash(float x){ return fract(sin(x)*152754.742);}
float hash(vec2 x){	return hash(x.x + hash(x.y));}
float hash3(vec3 p){
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

float value(vec2 p, float f) //value noise
{
    float bl = hash(floor(p*f + vec2(0.,0.)));
    float br = hash(floor(p*f + vec2(1.,0.)));
    float tl = hash(floor(p*f + vec2(0.,1.)));
    float tr = hash(floor(p*f + vec2(1.,1.)));

    vec2 fr = fract(p*f);
    fr = (3. - 2.*fr)*fr*fr;
    float b = mix(bl, br, fr.x);
    float t = mix(tl, tr, fr.x);
    return  mix(b,t, fr.y);
}

// Seamless 3D value noise — sample on ray direction, no cubemap seams
float value3(vec3 p)
{
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f*f*(3.0 - 2.0*f);

    float n000 = hash3(i + vec3(0.,0.,0.));
    float n100 = hash3(i + vec3(1.,0.,0.));
    float n010 = hash3(i + vec3(0.,1.,0.));
    float n110 = hash3(i + vec3(1.,1.,0.));
    float n001 = hash3(i + vec3(0.,0.,1.));
    float n101 = hash3(i + vec3(1.,0.,1.));
    float n011 = hash3(i + vec3(0.,1.,1.));
    float n111 = hash3(i + vec3(1.,1.,1.));

    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);
    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);
    return mix(nxy0, nxy1, f.z);
}

float fbm3(vec3 p)
{
    float a = 0.5 * value3(p);
    a += 0.25 * value3(p * 2.03);
    a += 0.125 * value3(p * 4.07);
    return a;
}

vec4 background(vec3 ray)
{
    vec2 uv = ray.xy;

    if( abs(ray.x) > 0.5)
        uv.x = ray.z;
    else if( abs(ray.y) > 0.5)
        uv.y = ray.z;


    float brightness = value( uv*3., 100.); //(poor quality) "stars" created from value noise
    float color = value( uv*2., 20.);
    brightness = pow(brightness, 256.);

    brightness = brightness*100.;
    brightness = clamp(brightness, 0., 1.);

    vec3 stars = brightness * mix(vec3(1., .6, .2), vec3(.2, .6, 1), color);

    // Seamless nebula — light wash; color/intensity from panel uniforms
    vec3 nebulae = vec3(0.0);
    if (uNebulaIntensity > 0.001) {
        vec3 dir = normalize(ray);
        float n0 = fbm3(dir * 1.4 + vec3(0.0, 7.2, 0.0));
        float n1 = fbm3(dir * 1.4 + vec3(19.0, 0.0, 3.1));
        float dens = smoothstep(0.42, 0.78, (n0 + n1) * 0.55);
        dens *= dens;
        nebulae = uNebulaColor * dens * 0.22 * uNebulaIntensity;
    }

    return vec4(nebulae + stars, 1.0);
}

vec4 raymarchDisk(vec3 ray, vec3 zeroPos)
{
    //return vec4(1.,1.,1.,0.); //no disk

	vec3 position = zeroPos;
    float lengthPos = length(position.xz);
    float absRayY = max(abs(ray.y), RAY_Y_EPS);
    float dist = min(1., lengthPos*(1./_Size) *0.5) * _Size * 0.4 *(1./_Steps) / absRayY;

    position += dist*_Steps*ray*0.5;

    vec2 deltaPos;
    deltaPos.x = -zeroPos.z*0.01 + zeroPos.x;
    deltaPos.y = zeroPos.x*0.01 + zeroPos.z;
    deltaPos = normalize(deltaPos - zeroPos.xz);

    float parallel = dot(ray.xz, deltaPos);
    parallel /= sqrt(lengthPos);
    parallel *= 0.5;
    float redShift = parallel +0.3;
    redShift *= redShift;

    redShift = clamp(redShift, 0., 1.);

    float disMix = clamp((lengthPos - _Size * 2.)*(1./_Size)*0.24, 0., 1.);
    vec3 insideCol = mix(uHoleColor, uHoleColor * 0.18, disMix);

    insideCol *= mix(vec3(0.4, 0.2, 0.1), vec3(1.6, 2.4, 4.0), redShift);
	insideCol *= 1.25 * (1.0 + uHoleBoost);
    redShift += 0.12;
    redShift *= redShift;

    vec4 o = vec4(0.);

    for(float i = 0. ; i < _Steps; i++)
    {
        position -= dist * ray ;

        float intensity =clamp( 1. - abs((i - 0.8) * (1./_Steps) * 2.), 0., 1.);
        float lengthPos = length(position.xz);
        float distMult = 1.;

        distMult *=  clamp((lengthPos -  _Size * 0.75) * (1./_Size) * 1.5, 0., 1.);
        distMult *= clamp(( _Size * 10. -lengthPos) * (1./_Size) * 0.20, 0., 1.);
        distMult *= distMult;

        float u = lengthPos + iTime* _Size*0.3 + intensity * _Size * 0.2;

        vec2 xy ;
        float rot = mod(iTime*_Speed, 8192.);
        xy.x = -position.z*sin(rot) + position.x*cos(rot);
        xy.y = position.x*sin(rot) + position.z*cos(rot);

        float x = abs( xy.x/(xy.y));
		float angle = 0.02*atan(x);

        const float f = 70.;
        float noise = value( vec2( angle, u * (1./_Size) * 0.05), f);
        noise = noise*0.66 + 0.33*value( vec2( angle, u * (1./_Size) * 0.05), f*2.);

        float extraWidth =  noise * 1. * (1. -  clamp(i * (1./_Steps)*2. - 1., 0., 1.));

        float alpha = clamp(noise*(intensity + extraWidth)*( (1./_Size) * 10.  + 0.01 ) *  dist * distMult , 0., 1.);

        vec3 col = 2.*mix(vec3(0.3,0.2,0.15)*insideCol, insideCol, min(1.,intensity*2.));
        o = clamp(vec4(col*alpha + o.rgb*(1.-alpha), o.a*(1.-alpha) + alpha), vec4(0.), vec4(1.));

        lengthPos *= (1./_Size);

        o.rgb+= redShift*(intensity*1. + 0.5)* (1./_Steps) * 100.*distMult/(lengthPos*lengthPos);
    }

    o.rgb = clamp(o.rgb - 0.005, 0., 1.);
    return o ;
}


void Rotate( inout vec3 vector, vec2 angle )
{
	vector.yz = cos(angle.y)*vector.yz
				+sin(angle.y)*vec2(-1,1)*vector.zy;
	vector.xz = cos(angle.x)*vector.xz
				+sin(angle.x)*vec2(-1,1)*vector.zx;
}

// Rotate v around unit axis k (Rodrigues) — used to spin only the hole/disk
vec3 rotAround(vec3 v, vec3 k, float a)
{
    float c = cos(a);
    float s = sin(a);
    return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
}

void mainImage( out vec4 colOut, in vec2 fragCoord )
{
    colOut = vec4(0.);;

    // Centered frame — belt angle is controlled in 3D on the hole itself
    vec2 fragCoordRot = fragCoord;

    for( int j=0; j<AA; j++ )
    for( int i=0; i<AA; i++ )
    {
        //setting up camera (yaw + pitch rotate the view / space)
        vec3 ray = normalize( vec3((fragCoordRot-iResolution.xy*.5  + vec2(i,j)/(float(AA)))/iResolution.x, 1 ));
        // Camera on −Z, no Y offset — keeps the hole dead-center
        vec3 pos = vec3(0.,0.,-(20.*MOUSE_X-10.)*(20.*MOUSE_X-10.)*.05);
        vec2 angle = vec2(uYaw, uPitch);
        Rotate(pos,angle);
        Rotate(ray,angle);

        // Belt angle: roll hole/disk around the view axis only.
        // Background is sampled with the inverse roll so space stays put.
        vec3 camAxis = normalize(pos);
        ray = rotAround(ray, camAxis, uBeltAngle);

        vec4 col = vec4(0.);
        vec4 glow = vec4(0.);
        vec4 outCol =vec4(100.);

        for(int disks = 0; disks< 20; disks++) //steps
        {

            for (int h = 0; h < 6; h++) //reduces tests for exit conditions (to minimise branching)
            {
                float dotpos = dot(pos,pos);
                float invDist = inversesqrt(dotpos); //1/distance to BH
                float centDist = dotpos * invDist; 	//distance to BH
                float absRayY = max(abs(ray.y), RAY_Y_EPS);
                float stepDist = 0.92 * abs(pos.y) / absRayY;  //conservative distance to disk (y==0)
                float farLimit = centDist * 0.5; //limit step size far from to BH
                float closeLimit = centDist*0.1 + 0.05*centDist*centDist*(1./_Size); //limit step size closse to BH
                stepDist = min(stepDist, min(farLimit, closeLimit));

                float invDistSqr = invDist * invDist;
                float bendForce = stepDist * invDistSqr * _Size * 0.625;  //bending force
                ray =  normalize(ray - (bendForce * invDist )*pos);  //bend ray towards BH
                pos += stepDist * ray;

                glow += vec4(uHoleColor * vec3(1.2,1.1,1.0), 1.0) *(0.01*stepDist * invDistSqr * invDistSqr *clamp( centDist*(2.) - 1.2,0.,1.) * (1.0 + uHoleBoost)); //adds fairly cheap glow
            }

            float dist2 = length(pos);

            if(dist2 < _Size * 0.1) //ray sucked in to BH
            {
                outCol =  vec4( col.rgb * col.a + glow.rgb *(1.-col.a ) ,1.) ;
                break;
            }

            else if(dist2 > _Size * 1000.) //ray escaped BH
            {
                // Un-roll so nebula/stars keep camera orientation
                vec3 rayBg = rotAround(ray, camAxis, -uBeltAngle);
                vec4 bg = background (rayBg);
                outCol = vec4(col.rgb*col.a + bg.rgb*(1.-col.a)  + glow.rgb *(1.-col.a    ), 1.);
                break;
            }

            // Skip unstable edge-on hits when ray is almost parallel to the disk
            else if (abs(pos.y) <= _Size * 0.002 && abs(ray.y) > RAY_Y_EPS)
            {
                vec4 diskCol = raymarchDisk(ray, pos);   //render disk
                pos.y = 0.;
                pos += abs(_Size * 0.001 / max(abs(ray.y), RAY_Y_EPS)) * ray;
                col = vec4(diskCol.rgb*(1.-col.a) + col.rgb, col.a + diskCol.a*(1.-col.a));
            }
        }

        //if the ray never escaped or got sucked in
        if(outCol.r == 100.)
            outCol = vec4(col.rgb + glow.rgb *(col.a +  glow.a) , 1.);

        col = outCol;
        col.rgb =  pow( col.rgb, vec3(0.6) );

        colOut += col/float(AA*AA);
    }
}

void main() {
  vec4 col;
  mainImage(col, vUv * iResolution.xy);
  gl_FragColor = col;
}
`;
