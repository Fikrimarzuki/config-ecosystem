# Ecosystem Config

Central configuration and project registry for my personal developer ecosystem.

This repository acts as the **single source of truth** for shared public configuration used across my projects, including repository mappings, deployments, domains, and project relationships.

## Why?

My projects are spread across multiple GitHub repositories and deployments, but many of them link to each other.

Instead of hardcoding values such as:

```text id="j5nnbw"
https://play.fikrimarzuki.work
https://page-layr.fikrimarzuki.work
https://tinyverse.fikrimarzuki.work
```

inside multiple applications, those applications can consume this shared configuration.

When a shared value such as the primary domain changes, it can be updated here and propagated to dependent projects.

## Naming Layers

The ecosystem intentionally separates three concepts:

```text id="m8v28p"
GitHub repository → Deployment → Public domain
```

Example:

```text id="f70c71"
game-tinyverse → tinyverse → tinyverse.fikrimarzuki.work
```

GitHub repository prefixes describe what a repository is internally and are not automatically exposed through deployment names or public URLs.

## Shared Configuration

Common values are defined once:

```json id="e87a81"
{
  "version": 1,
  "username": "Fikrimarzuki",
  "domains": {
    "primary": "fikrimarzuki.work"
  }
}
```

Project URLs and repository URLs can then be derived from this configuration.

For example:

```text id="e9otfd"
username   = Fikrimarzuki
repository = app-playdeck

→ github.com/Fikrimarzuki/app-playdeck
```

```text id="6gnb7p"
subdomain      = playdeck
primary domain = fikrimarzuki.work

→ playdeck.fikrimarzuki.work
```

## Project Model

A project defines its repository and one or more deployments.

```json id="j5l0tp"
{
  "name": "Playdeck",
  "repository": "app-playdeck",
  "deployments": {
    "main": {
      "name": "playdeck",
      "subdomain": "playdeck"
    }
  }
}
```

Using deployments separately from repositories allows the registry to represent projects where:

* one repository has one deployment;
* multiple projects share a repository;
* one project/repository has multiple deployments;
* a repository has no public deployment.

## Monorepo / Shared Repository Projects

Some projects may share the same repository.

For example, prototype projects can reference `lab-projects` while identifying their own path within that repository.

```json id="pkwf1e"
{
  "name": "Foodie Map",
  "repository": "lab-projects",
  "path": "foodie-map",
  "deployments": {
    "main": {
      "name": "foodie-map",
      "subdomain": "foodie-map"
    }
  }
}
```

## Multiple Deployments

A project can expose multiple deployments.

For example, an ecosystem such as Neuran may contain:

```text id="i1s5f0"
Neuran
├── Main
├── Admin
├── LMS
├── Skill
└── Social
```

Each deployment can have its own public subdomain while still belonging to the same project.

## Repository Structure

```text id="wxp83q"
config-ecosystem/
├── config/
│   └── production.json
└── README.md
```

Additional validation and automation may be introduced as the registry evolves.

## Usage

Applications can retrieve the production registry during development or as part of their build process.

The intended flow is:

```text id="e3sg7c"
config-ecosystem
       │
       ▼
sync configuration
       │
       ▼
consumer application
       │
       ▼
build
       │
       ▼
deploy
```

Eventually, updates to this repository can trigger builds of dependent projects automatically.

## Security

This repository contains **public configuration only**.

Do not store:

* API keys
* access tokens
* passwords
* private credentials
* database connection strings
* secret environment variables
* other sensitive information

Anything committed to this repository should be considered publicly accessible.

## Status

Early development.

Current goals:

1. Establish the project and deployment registry.
2. Integrate the Developer Ecosystem Gateway as the first consumer.
3. Add schema validation.
4. Integrate additional projects.
5. Automate dependent project rebuilds.
