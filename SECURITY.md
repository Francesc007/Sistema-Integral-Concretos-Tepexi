# Seguridad del repositorio

## Secretos y variables de entorno

- No subas archivos `.env`, `.env.local` ni claves API. Están excluidos por `.gitignore`.
- Usa `web/.env.example` como plantilla sin valores sensibles; la copia real solo en tu equipo (`cp .env.example .env.local`).

## Antes de hacer commit

- Revisa `git diff --staged` y confirma que no hay contraseñas, tokens ni datos personales de clientes.
- Si filtraste un secreto por error, rota la credencial en el proveedor y considera [BFG](https://rtyley.github.io/bfg-repo-cleaner/) o soporte de GitHub para limpiar el historial.

## GitHub (recomendado en el panel del repo)

- Activar **2FA** en tu cuenta de GitHub.
- En **Settings → Secrets and variables**: usar *Secrets* para CI/CD, no valores en código.
- Opcional: **Branch protection rules** en `main` (revisión, comprobaciones obligatorias).

## Reporte de vulnerabilidades

Contacto del mantenedor del proyecto para reportes responsables de seguridad (definir correo interno de la empresa).
