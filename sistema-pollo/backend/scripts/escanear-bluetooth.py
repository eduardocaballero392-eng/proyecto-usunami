#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para escanear dispositivos Bluetooth disponibles
Útil para encontrar el nombre exacto de tu impresora térmica Bluetooth

REQUISITOS:
- Python 3.8+
- pip install bleak

USO:
    python escanear-bluetooth.py

NOTA:
    El escaneo puede tardar 5-10 segundos en completarse.
    Asegúrate de que tu impresora esté encendida y en modo de emparejamiento.
"""

import asyncio
import sys

try:
    from bleak import BleakScanner
except ImportError:
    print("ERROR: La librería 'bleak' no está instalada.")
    print("\nPara instalar, ejecuta:")
    print("  pip install bleak")
    print("\nSi tienes múltiples versiones de Python:")
    print("  python -m pip install bleak")
    sys.exit(1)


async def escanear_dispositivos():
    """Escanea y lista todos los dispositivos Bluetooth disponibles"""
    print("=" * 60)
    print("ESCANEANDO DISPOSITIVOS BLUETOOTH...")
    print("=" * 60)
    print("\nEsto puede tardar unos segundos...\n")
    
    try:
        # Escanear por 10 segundos
        devices = await BleakScanner.discover(timeout=10.0)
        
        if not devices:
            print("⚠️  No se encontraron dispositivos Bluetooth")
            print("\nPosibles causas:")
            print("  • Bluetooth desactivado en tu computadora")
            print("  • Impresora apagada o sin batería")
            print("  • Impresora fuera de rango (debe estar a menos de 10m)")
            print("  • Impresora ya conectada a otro dispositivo")
            return
        
        print(f"✅ Encontrados {len(devices)} dispositivos:\n")
        print("-" * 60)
        
        # Ordenar por señal (RSSI) de mayor a menor
        devices_sorted = sorted(devices, key=lambda d: d.rssi or -999, reverse=True)
        
        for i, device in enumerate(devices_sorted, 1):
            nombre = device.name or "[Sin nombre]"
            direccion = device.address
            rssi = device.rssi or "N/A"
            
            # Marcar posibles impresoras por nombre común
            es_impresora = any(keyword in nombre.upper() for keyword in [
                'RPP', 'MTP', 'POS', 'PRINTER', 'THERMAL', 'EPSON', 'STAR', 'BIXOLON'
            ])
            
            print(f"{i}. {'🖨️ ' if es_impresora else '  '} {nombre}")
            print(f"   Dirección: {direccion}")
            print(f"   Señal: {rssi} dBm")
            
            if es_impresora:
                print(f"   ⭐ Posible impresora térmica")
            
            print("-" * 60)
        
        print("\n📋 INSTRUCCIONES:")
        print("1. Busca tu impresora en la lista (probablemente con 🖨️)")
        print("2. Copia el NOMBRE EXACTO (case-sensitive)")
        print("3. Ejecuta esta migración SQL:")
        print("\n   UPDATE impresoras")
        print("   SET tipo_conexion = 'BLUETOOTH',")
        print("       nombre_bluetooth = 'NOMBRE_DE_TU_IMPRESORA'")
        print("   WHERE id_impresoras = 1;  -- Cambiar por el ID correcto")
        print("\n4. En el archivo .env, configura:")
        print("   PRINTER_MODE=bluetooth")
        print("   PRINTER_TIMEOUT_MS=10000")
        
    except Exception as e:
        print(f"❌ Error al escanear: {e}")
        print(f"\nDetalles: {type(e).__name__}: {str(e)}")
        sys.exit(1)


async def verificar_impresora(nombre: str):
    """Verifica si una impresora específica está disponible"""
    print(f"\n🔍 Buscando dispositivo: {nombre}...")
    
    devices = await BleakScanner.discover(timeout=10.0)
    
    for device in devices:
        if device.name == nombre:
            print(f"✅ ¡Impresora encontrada!")
            print(f"   Nombre: {device.name}")
            print(f"   Dirección: {device.address}")
            print(f"   Señal: {device.rssi} dBm")
            return True
    
    print(f"❌ No se encontró el dispositivo '{nombre}'")
    print("\nPosibles causas:")
    print("  • El nombre no coincide exactamente (es case-sensitive)")
    print("  • La impresora está apagada")
    print("  • La impresora está fuera de rango")
    return False


def main():
    """Punto de entrada principal"""
    if len(sys.argv) > 1:
        # Si se pasa un argumento, verificar ese dispositivo específico
        nombre = sys.argv[1]
        asyncio.run(verificar_impresora(nombre))
    else:
        # Sin argumentos, escanear todos los dispositivos
        asyncio.run(escanear_dispositivos())


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Escaneo cancelado por el usuario")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error inesperado: {e}")
        sys.exit(1)
