import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'

const FONT_HREF = 'https://fonts.googleapis.com/css?family=Arvo'

const styles = `
.page_404 {
  padding: 40px 0;
  background: #fff;
  font-family: 'Arvo', serif;
  min-height: 100vh;
}

.page_404 .pg404_container {
  max-width: 1170px;
  margin: 0 auto;
  padding: 0 15px;
}

.page_404 .pg404_inner {
  max-width: 83.33%;
  margin: 0 auto;
  text-align: center;
}

.four_zero_four_bg {
  background-image: url(https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif);
  height: 400px;
  background-position: center;
  background-repeat: no-repeat;
}

.four_zero_four_bg h1 {
  font-size: 80px;
  text-align: center;
}

.four_zero_four_bg h3 {
  font-size: 80px;
}

.contant_box_404 {
  margin-top: -50px;
}

.contant_box_404 .pg404_subtitle {
  font-size: 28px;
}

.link_404 {
  color: #fff !important;
  padding: 10px 20px;
  background: #39ac31;
  margin: 20px 0;
  display: inline-block;
  text-decoration: none;
}
`

export default function NotFound() {
  useEffect(() => {
    if (!document.querySelector(`link[href="${FONT_HREF}"]`)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = FONT_HREF
      document.head.appendChild(link)
    }
  }, [])

  return (
    <section className="page_404">
      <style>{styles}</style>
      <div className="pg404_container">
        <div className="pg404_inner">
          <div className="four_zero_four_bg">
            <h1>404</h1>
          </div>

          <div className="contant_box_404">
            <h3 className="pg404_subtitle">Look like you're lost</h3>

            <p>the page you are looking for not avaible!</p>

            <Link to="/" className="link_404">
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
