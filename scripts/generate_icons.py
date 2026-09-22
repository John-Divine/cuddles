import struct
import zlib
import math

def write_png(filename, width, height, pixels):
    # pixels is a flat list of RGBA tuples: (r, g, b, a)
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0) # filter type 0 (None)
        row_offset = y * width
        for x in range(width):
            r, g, b, a = pixels[row_offset + x]
            raw_data.extend((r, g, b, a))

    def chunk(tag, data):
        length = struct.pack('>I', len(data))
        crc = struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
        return length + tag + data + crc

    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    idat_data = zlib.compress(bytes(raw_data), 9)

    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr_data) + chunk(b'IDAT', idat_data) + chunk(b'IEND', b'')
    with open(filename, 'wb') as f:
        f.write(png)

def render_icon(size, is_maskable=False):
    pixels = []
    center = size / 2.0
    scale = size / 512.0

    # Colors
    bg_dark = (15, 23, 42, 255) # #0f172a
    bg_indigo = (30, 27, 75, 255) # #1e1b4b
    rose = (251, 113, 133, 255) # #fb7185
    violet = (129, 140, 248, 255) # #818cf8
    white = (255, 255, 255, 255)
    pin_dark = (15, 23, 42, 255)

    ring1_cx = center - 54 * scale
    ring1_cy = center - 10 * scale
    ring2_cx = center + 54 * scale
    ring2_cy = center - 10 * scale
    ring_radius = 68 * scale
    ring_half_thick = 11 * scale

    pin_cx = center
    pin_cy = center - 10 * scale
    pin_r = 28 * scale

    for y in range(size):
        for x in range(size):
            # Background gradient
            t = (x + y) / (2.0 * size)
            r = int(bg_dark[0] * (1 - t) + bg_indigo[0] * t)
            g = int(bg_dark[1] * (1 - t) + bg_indigo[1] * t)
            b = int(bg_dark[2] * (1 - t) + bg_indigo[2] * t)
            color = [r, g, b, 255]

            # Distance to ring 1
            d1 = math.hypot(x - ring1_cx, y - ring1_cy)
            dist_to_stroke1 = abs(d1 - ring_radius)
            if dist_to_stroke1 < ring_half_thick:
                alpha = max(0.0, min(1.0, (ring_half_thick - dist_to_stroke1) / 1.5))
                # blend rose
                color[0] = int(color[0] * (1 - alpha) + rose[0] * alpha)
                color[1] = int(color[1] * (1 - alpha) + rose[1] * alpha)
                color[2] = int(color[2] * (1 - alpha) + rose[2] * alpha)

            # Distance to ring 2
            d2 = math.hypot(x - ring2_cx, y - ring2_cy)
            dist_to_stroke2 = abs(d2 - ring_radius)
            if dist_to_stroke2 < ring_half_thick:
                alpha = max(0.0, min(1.0, (ring_half_thick - dist_to_stroke2) / 1.5))
                # blend violet
                color[0] = int(color[0] * (1 - alpha) + violet[0] * alpha)
                color[1] = int(color[1] * (1 - alpha) + violet[1] * alpha)
                color[2] = int(color[2] * (1 - alpha) + violet[2] * alpha)

            # Center Lock Pin
            d_pin = math.hypot(x - pin_cx, y - pin_cy)
            if d_pin <= pin_r:
                if d_pin > pin_r - 2:
                    aa = pin_r - d_pin
                    color[0] = int(color[0] * (1 - aa) + white[0] * aa)
                    color[1] = int(color[1] * (1 - aa) + white[1] * aa)
                    color[2] = int(color[2] * (1 - aa) + white[2] * aa)
                else:
                    # Inner lock keyhole
                    d_inner = math.hypot(x - pin_cx, y - (pin_cy + 3 * scale))
                    if d_inner < 5 * scale or (abs(x - pin_cx) < 4 * scale and abs(y - pin_cy) < 10 * scale):
                        color[0], color[1], color[2] = pin_dark[0], pin_dark[1], pin_dark[2]
                    else:
                        color[0], color[1], color[2] = white[0], white[1], white[2]

            r_val = max(0, min(255, int(color[0])))
            g_val = max(0, min(255, int(color[1])))
            b_val = max(0, min(255, int(color[2])))
            pixels.append((r_val, g_val, b_val, 255))

    return pixels

print("Generating 192x192...")
write_png("public/icon-192.png", 192, 192, render_icon(192))
print("Generating 512x512...")
write_png("public/icon-512.png", 512, 512, render_icon(512))
print("Generating 512x512 maskable...")
write_png("public/icon-maskable-512.png", 512, 512, render_icon(512, is_maskable=True))
print("Generating apple-touch-icon.png...")
write_png("public/apple-touch-icon.png", 180, 180, render_icon(180))
print("Done!")
